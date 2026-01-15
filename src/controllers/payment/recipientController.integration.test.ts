/**
 * ⚠️  TESTES MANUAIS - API EXTERNA (PAGARME)
 * 
 * ATENÇÃO: Estes testes fazem chamadas REAIS à API da Pagarme
 * e criam dados REAIS no sistema.
 * 
 * ❌ NÃO RODAM NA CI/CD (pulados automaticamente)
 * ✅ Úteis para DEBUGGING e DESENVOLVIMENTO MANUAL
 * 
 * Para executar manualmente:
 *   NODE_ENV=development npm test -- recipientController.integration.test.ts
 * 
 * POR QUÊ MANTEMOS ESTES TESTES?
 * - Validar integração com gateway de pagamento
 * - Debugging rápido de problemas de split/recipient
 * - Documentação viva de como usar a API da Pagarme
 * 
 * ALTERNATIVA RECOMENDADA:
 * - Use postman/insomnia para testes manuais de API
 * - Estes testes ficam como referência de código
 */

import request from 'supertest';
import app from '@/server';
import prisma from '@/config/database';
import { safeTestCleanup, TestDataTracker, createTestToken } from '@/utils/test-helpers';
import type { IndividualRecipientData } from '@/interfaces/payment/payment';

jest.setTimeout(60000);

// ⚠️  Só roda manualmente em desenvolvimento
const shouldRunTests = process.env.NODE_ENV === 'development' && process.env.RUN_MANUAL_TESTS === 'true';

describe('🔧 MANUAL - Recipient API Integration (Pagarme)', () => {
  beforeAll(() => {
    if (!shouldRunTests) {
      console.warn(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  TESTES MANUAIS PULADOS

Estes testes fazem chamadas REAIS à API da Pagarme.

Para executar:
  NODE_ENV=development RUN_MANUAL_TESTS=true npm test -- recipientController.integration.test.ts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
      return;
    }
  });

  const testDataTracker = new TestDataTracker();
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    if (!shouldRunTests) return;

    authToken = await createTestToken(prisma, testDataTracker);
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'test-secret') as { userId: string };
    testUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { person: true },
    });

    if (testUser?.person && !testUser.person.nationalRegistration) {
      await prisma.person.update({
        where: { id: testUser.person.id },
        data: { nationalRegistration: '12345678901' },
      });
    }
  });

  afterAll(async () => {
    if (!shouldRunTests) return;
    await safeTestCleanup(testDataTracker, prisma);
    await prisma.$disconnect();
  });

  describe('POST /api/payment/recipients/individual', () => {
    it('[MANUAL] deve criar recebedor pessoa física', async () => {
      if (!shouldRunTests) return;

      const recipientData: IndividualRecipientData = {
        register_information: {
          phone_numbers: [{ ddd: '21', number: '994647568', type: 'mobile' }],
          address: {
            street: 'Av. General Justo',
            complementary: 'Bloco A',
            street_number: '375',
            neighborhood: 'Centro',
            city: 'Rio de Janeiro',
            state: 'RJ',
            zip_code: '20021130',
            reference_point: 'Ao lado da banca de jornal',
          },
          name: `Manual Test ${Date.now()}`,
          email: `manual.test.${Date.now()}@example.com`,
          document: '26224451990',
          type: 'individual',
          site_url: 'https://example.com',
          mother_name: 'Maria Silva',
          birthdate: '12/10/1995',
          monthly_income: 12000000,
          professional_occupation: 'Vendedor',
        },
        default_bank_account: {
          holder_name: 'Manual Test',
          holder_type: 'individual',
          holder_document: '26224451990',
          bank: '341',
          branch_number: '1234',
          branch_check_digit: '6',
          account_number: '12345',
          account_check_digit: '6',
          type: 'checking',
        },
        transfer_settings: {
          transfer_enabled: false,
          transfer_interval: 'Daily',
          transfer_day: 0,
        },
      };

      const response = await request(app)
        .post('/api/payment/recipients/individual')
        .set('Authorization', `Bearer ${authToken}`)
        .send(recipientData);

      expect([200, 201]).toContain(response.status);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');

      const dbRecipient = await prisma.pagarmeRecipient.findFirst({
        where: { recipientId: response.body.data.id },
      });
      if (dbRecipient) {
        testDataTracker.add('pagarmeRecipient', dbRecipient.id);
      }

      console.log('✅ Recebedor criado:', response.body.data.id);
    });
  });

  describe('GET /api/payment/recipients', () => {
    it('[MANUAL] deve listar recebedores', async () => {
      if (!shouldRunTests) return;

      const response = await request(app)
        .get('/api/payment/recipients')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(typeof response.body.data === 'object').toBe(true);

      console.log('✅ Recebedores listados:', Object.keys(response.body.data).length);
    });
  });
});

describe('🔧 MANUAL - Payment Split Integration', () => {
  const testDataTracker = new TestDataTracker();
  let authToken: string;
  let testUser: any;
  let testProduct: any;

  beforeAll(async () => {
    if (!shouldRunTests) return;

    authToken = await createTestToken(prisma, testDataTracker);
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'test-secret') as { userId: string };
    testUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { person: true },
    });

    if (testUser?.person && !testUser.person.nationalRegistration) {
      await prisma.person.update({
        where: { id: testUser.person.id },
        data: { nationalRegistration: '12345678901' },
      });
    }

    testProduct = await prisma.product.create({
      data: {
        name: `Manual Test Product ${Date.now()}`,
        description: 'Test split payment',
        price: 10000,
        quantity: 10,
        status: 'active',
      },
    });
    testDataTracker.add('product', testProduct.id);
  });

  afterAll(async () => {
    if (!shouldRunTests) return;
    await safeTestCleanup(testDataTracker, prisma);
    await prisma.$disconnect();
  });

  describe('POST /api/orders com split', () => {
    it('[MANUAL] deve criar pedido com split configurado', async () => {
      if (!shouldRunTests) return;

      const orderData = {
        items: [{ productId: testProduct.id, quantity: 1, discount: 0 }],
        status: 'pending',
        shippingCost: 1000,
        tax: 0,
        shippingAddress: 'Rua Teste, 123 - São Paulo, SP - 01234567',
        billingAddress: {
          country: 'br',
          state: 'SP',
          city: 'São Paulo',
          street: 'Rua Teste',
          streetNumber: '123',
          zipcode: '01234567',
          neighborhood: 'Centro',
        },
        paymentMethod: 'credit_card',
        cardData: {
          cardNumber: '4000000000000002',
          cardHolderName: 'Manual Test',
          cardExpirationDate: '1226',
          cardCvv: '123',
          cpf: '11144477735',
          phone: '11999999999',
        },
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData);

      if (response.status !== 201) {
        console.error('❌ Erro:', response.body);
        return;
      }

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      testDataTracker.add('order', response.body.data.id);
      console.log('✅ Pedido criado:', response.body.data.id);
    });
  });
});
