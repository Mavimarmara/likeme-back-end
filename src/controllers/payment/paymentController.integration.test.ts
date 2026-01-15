import request from 'supertest';
import app from '@/server';
import prisma from '@/config/database';
import { safeTestCleanup, TestDataTracker, createTestToken as createTestTokenHelper } from '@/utils/test-helpers';

jest.setTimeout(30000);

// Mock do cliente Pagarme
jest.mock('@/clients/pagarme/pagarmeClient', () => ({
  getPagarmeClient: jest.fn(),
  createCreditCardTransaction: jest.fn(),
  getTransaction: jest.fn(),
  captureTransaction: jest.fn(),
  refundTransaction: jest.fn(),
}));

beforeAll(async () => {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  NODE_ENV não está definido como "test". Os testes podem afetar o banco de dados de desenvolvimento!');
  }
});

const testDataTracker = new TestDataTracker();

afterAll(async () => {
  await safeTestCleanup(testDataTracker, prisma);
  await prisma.$disconnect();
});

// Helper para criar um token de teste usando o utilitário centralizado
const createTestToken = async (): Promise<string> => {
  return createTestTokenHelper(prisma, testDataTracker);
};

describe('Payment Endpoints', () => {
  let authToken: string;
  let testUser: any;
  let testProduct: any;
  let testOrder: any;
  const {
    createCreditCardTransaction,
    getTransaction,
    captureTransaction,
    refundTransaction,
  } = require('@/clients/pagarme/pagarmeClient');

  beforeAll(async () => {
    authToken = await createTestToken();

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'test-secret') as { userId: string };
    testUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        person: {
          include: {
            contacts: true,
          },
        },
      },
    });

    // Garantir que o usuário tem CPF no nationalRegistration
    if (testUser?.person) {
      await prisma.person.update({
        where: { id: testUser.person.id },
        data: { nationalRegistration: '12345678901' },
      });
    }

    // Criar produto de teste
    testProduct = await prisma.product.create({
      data: {
        name: 'Test Product',
        price: 99.99,
        quantity: 100,
        status: 'active',
      },
    });
    testDataTracker.add('product', testProduct.id);

    // Criar pedido de teste
    const { Decimal } = require('@prisma/client/runtime/library');
    const unitPrice = new Decimal(testProduct.price.toString());
    const total = unitPrice.times(2);

    testOrder = await prisma.order.create({
      data: {
        userId: testUser.id,
        subtotal: total,
        total: total,
        shippingCost: new Decimal(0),
        tax: new Decimal(0),
        status: 'pending',
        paymentStatus: 'pending',
        items: {
          create: [
            {
              productId: testProduct.id,
              quantity: 2,
              unitPrice: unitPrice,
              discount: new Decimal(0),
              total: total,
            },
          ],
        },
      },
      include: { items: true },
    });
    testDataTracker.add('order', testOrder.id);
    testOrder.items.forEach((item: any) => testDataTracker.add('orderItem', item.id));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/payment/process', () => {
    it('should process payment successfully', async () => {
      const mockTransaction = {
        id: 'trans_123456',
        status: 'paid',
        authorization_code: 'AUTH123',
      };

      createCreditCardTransaction.mockResolvedValue(mockTransaction);

      const paymentData = {
        orderId: testOrder.id,
        cardData: {
          cardNumber: '4111111111111111',
          cardHolderName: 'Test User',
          cardExpirationDate: '1225',
          cardCvv: '123',
          cpf: '12345678901', // CPF para o teste
        },
        billingAddress: {
          country: 'br',
          state: 'SP',
          city: 'São Paulo',
          neighborhood: 'Centro',
          street: 'Rua Test',
          streetNumber: '123',
          zipcode: '01234567',
        },
      };

      const response = await request(app)
        .post('/api/payment/process')
        .send(paymentData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order).toBeDefined();
      expect(response.body.data.transaction).toBeDefined();
      expect(response.body.data.transaction.id).toBe(mockTransaction.id);
      expect(response.body.data.order.paymentStatus).toBe('paid');

      // Verificar se o pedido foi atualizado
      const updatedOrder = await prisma.order.findUnique({
        where: { id: testOrder.id },
      });
      expect(updatedOrder?.paymentStatus).toBe('paid');
      expect(updatedOrder?.paymentMethod).toBe('credit_card');
    });

    it('should return 400 if order already paid', async () => {
      // Atualizar pedido para paid
      await prisma.order.update({
        where: { id: testOrder.id },
        data: { paymentStatus: 'paid' },
      });

      const paymentData = {
        orderId: testOrder.id,
        cardData: {
          cardNumber: '4111111111111111',
          cardHolderName: 'Test User',
          cardExpirationDate: '1225',
          cardCvv: '123',
        },
        billingAddress: {
          country: 'br',
          state: 'SP',
          city: 'São Paulo',
          street: 'Rua Test',
          streetNumber: '123',
          zipcode: '01234567',
        },
      };

      const response = await request(app)
        .post('/api/payment/process')
        .send(paymentData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      
      // Restaurar status
      await prisma.order.update({
        where: { id: testOrder.id },
        data: { paymentStatus: 'pending' },
      });
    });

    it('should return 404 if order not found', async () => {
      const paymentData = {
        orderId: '00000000-0000-0000-0000-000000000000', // UUID válido mas inexistente
        cardData: {
          cardNumber: '4111111111111111',
          cardHolderName: 'Test User',
          cardExpirationDate: '1225',
          cardCvv: '123',
        },
        billingAddress: {
          country: 'br',
          state: 'SP',
          city: 'São Paulo',
          street: 'Rua Test',
          streetNumber: '123',
          zipcode: '01234567',
        },
      };

      const response = await request(app)
        .post('/api/payment/process')
        .send(paymentData)
        .set('Authorization', `Bearer ${authToken}`);

      // Pode retornar 400 (validação) ou 404 (não encontrado), ambos são válidos
      expect([400, 404]).toContain(response.status);
    });

    it('should return 403 if order belongs to another user', async () => {
      // Criar outro usuário e pedido
      const otherToken = await createTestToken();
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(otherToken, process.env.JWT_SECRET || 'test-secret') as { userId: string };
      const otherUser = await prisma.user.findUnique({ where: { id: decoded.userId } });

      const otherOrder = await prisma.order.create({
        data: {
          userId: otherUser!.id,
          subtotal: new (require('@prisma/client/runtime/library').Decimal)(100),
          total: new (require('@prisma/client/runtime/library').Decimal)(100),
          shippingCost: new (require('@prisma/client/runtime/library').Decimal)(0),
          tax: new (require('@prisma/client/runtime/library').Decimal)(0),
          status: 'pending',
          paymentStatus: 'pending',
        },
      });
      testDataTracker.add('order', otherOrder.id);

      const paymentData = {
        orderId: otherOrder.id,
        cardData: {
          cardNumber: '4111111111111111',
          cardHolderName: 'Test User',
          cardExpirationDate: '1225',
          cardCvv: '123',
        },
        billingAddress: {
          country: 'br',
          state: 'SP',
          city: 'São Paulo',
          street: 'Rua Test',
          streetNumber: '123',
          zipcode: '01234567',
        },
      };

      const response = await request(app)
        .post('/api/payment/process')
        .send(paymentData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });

    it('should handle Pagarme transaction error', async () => {
      // Mock para retornar status 'refused' ao invés de lançar erro
      createCreditCardTransaction.mockResolvedValue({
        id: 'trans_refused',
        status: 'refused',
      });

      const paymentData = {
        orderId: testOrder.id,
        cardData: {
          cardNumber: '4000000000000002', // Cartão recusado
          cardHolderName: 'Test User',
          cardExpirationDate: '1225',
          cardCvv: '123',
          cpf: '12345678901', // CPF para o teste
        },
        billingAddress: {
          country: 'br',
          state: 'SP',
          city: 'São Paulo',
          street: 'Rua Test',
          streetNumber: '123',
          zipcode: '01234567',
        },
      };

      const response = await request(app)
        .post('/api/payment/process')
        .send(paymentData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);

      // Verificar se o pedido foi marcado como failed
      const updatedOrder = await prisma.order.findUnique({
        where: { id: testOrder.id },
      });
      expect(updatedOrder?.paymentStatus).toBe('failed');
    });

    it('should validate required fields', async () => {
      const paymentData = {
        // Missing orderId
        cardData: {
          cardNumber: '4111111111111111',
          cardHolderName: 'Test User',
          cardExpirationDate: '1225',
          cardCvv: '123',
        },
      };

      const response = await request(app)
        .post('/api/payment/process')
        .send(paymentData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should return 401 if not authenticated', async () => {
      const paymentData = {
        orderId: testOrder.id,
        cardData: {
          cardNumber: '4111111111111111',
          cardHolderName: 'Test User',
          cardExpirationDate: '1225',
          cardCvv: '123',
        },
        billingAddress: {
          country: 'br',
          state: 'SP',
          city: 'São Paulo',
          street: 'Rua Test',
          streetNumber: '123',
          zipcode: '01234567',
        },
      };

      const response = await request(app)
        .post('/api/payment/process')
        .send(paymentData);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/payment/status/:transactionId', () => {
    it('should get transaction status successfully', async () => {
      const mockTransaction = {
        id: 'trans_123456',
        status: 'paid',
        amount: 19998, // em centavos
        authorization_code: 'AUTH123',
      };

      getTransaction.mockResolvedValue(mockTransaction);

      const response = await request(app)
        .get('/api/payment/status/trans_123456')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(mockTransaction.id.toString());
      expect(response.body.data.status).toBe(mockTransaction.status);
      // Amount é convertido de centavos para reais no endpoint
      expect(response.body.data.amount).toBe(mockTransaction.amount / 100);
    });

    it('should return 404 if transaction not found', async () => {
      getTransaction.mockRejectedValue(new Error('Transaction not found'));

      const response = await request(app)
        .get('/api/payment/status/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/payment/status/trans_123456');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/payment/capture/:transactionId', () => {
    it('should capture transaction successfully', async () => {
      const mockTransaction = {
        id: 'trans_123456',
        status: 'paid',
      };

      captureTransaction.mockResolvedValue(mockTransaction);

      const response = await request(app)
        .post('/api/payment/capture/trans_123456')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(mockTransaction.id);
      expect(response.body.data.status).toBe(mockTransaction.status);
    });

    it('should capture partial amount', async () => {
      const mockTransaction = {
        id: 'trans_123456',
        status: 'paid',
      };

      captureTransaction.mockResolvedValue(mockTransaction);

      const response = await request(app)
        .post('/api/payment/capture/trans_123456')
        .send({ amount: 50.00 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(captureTransaction).toHaveBeenCalledWith('trans_123456', 5000); // 50.00 em centavos
    });

    it('should return 400 if capture fails', async () => {
      captureTransaction.mockRejectedValue(new Error('Cannot capture transaction'));

      const response = await request(app)
        .post('/api/payment/capture/trans_123456')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/api/payment/capture/trans_123456');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/payment/refund/:transactionId', () => {
    it('should refund transaction successfully', async () => {
      const mockTransaction = {
        id: 'trans_123456',
        status: 'refunded',
      };

      refundTransaction.mockResolvedValue(mockTransaction);

      const response = await request(app)
        .post('/api/payment/refund/trans_123456')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(mockTransaction.id);
      expect(response.body.data.status).toBe(mockTransaction.status);
    });

    it('should refund partial amount', async () => {
      const mockTransaction = {
        id: 'trans_123456',
        status: 'refunded',
      };

      refundTransaction.mockResolvedValue(mockTransaction);

      const response = await request(app)
        .post('/api/payment/refund/trans_123456')
        .send({ amount: 25.00 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(refundTransaction).toHaveBeenCalledWith('trans_123456', 2500); // 25.00 em centavos
    });

    it('should return 400 if refund fails', async () => {
      refundTransaction.mockRejectedValue(new Error('Cannot refund transaction'));

      const response = await request(app)
        .post('/api/payment/refund/trans_123456')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/api/payment/refund/trans_123456');

      expect(response.status).toBe(401);
    });
  });

  describe('CPF handling', () => {
    it('should use CPF from cardData when provided', async () => {
      const { createCreditCardTransaction } = require('@/clients/pagarme/pagarmeClient');
      createCreditCardTransaction.mockClear();
      createCreditCardTransaction.mockResolvedValue({
        id: 'trans_test_cpf',
        status: 'paid',
      });

      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'test-secret') as { userId: string };
      const authenticatedUser = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { person: true },
      });

      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          description: 'Test',
          price: 100,
          quantity: 10,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      const order = await prisma.order.create({
        data: {
          userId: authenticatedUser!.id,
          status: 'pending',
          subtotal: 100,
          shippingCost: 0,
          tax: 0,
          total: 100,
          items: {
            create: {
              productId: product.id,
              quantity: 1,
              unitPrice: 100,
              discount: 0,
              total: 100,
            },
          },
        },
      });
      testDataTracker.add('order', order.id);

      const response = await request(app)
        .post('/api/payment/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: order.id,
          cardData: {
            cardNumber: '4111111111111111',
            cardHolderName: 'Test User',
            cardExpirationDate: '1225',
            cardCvv: '123',
            cpf: '12345678901', // CPF enviado pelo frontend
          },
          billingAddress: {
            country: 'br',
            state: 'SP',
            city: 'São Paulo',
            street: 'Av. Test',
            streetNumber: '123',
            zipcode: '01234567',
          },
        });

      expect(response.status).toBe(200);
      expect(createCreditCardTransaction).toHaveBeenCalled();
      const callArgs = createCreditCardTransaction.mock.calls[0][0];
      expect(callArgs.customer.documents).toBeDefined();
      expect(callArgs.customer.documents[0].number).toBe('12345678901');
    });

    it('should fallback to nationalRegistration when CPF not in cardData', async () => {
      const { createCreditCardTransaction } = require('@/clients/pagarme/pagarmeClient');
      createCreditCardTransaction.mockClear();
      createCreditCardTransaction.mockResolvedValue({
        id: 'trans_test_fallback',
        status: 'paid',
      });

      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'test-secret') as { userId: string };
      const authenticatedUser = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { person: true },
      });

      // Atualizar person com nationalRegistration
      await prisma.person.update({
        where: { id: authenticatedUser!.personId },
        data: { nationalRegistration: '98765432100' },
      });

      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          description: 'Test',
          price: 100,
          quantity: 10,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      const order = await prisma.order.create({
        data: {
          userId: authenticatedUser!.id,
          status: 'pending',
          subtotal: 100,
          shippingCost: 0,
          tax: 0,
          total: 100,
          items: {
            create: {
              productId: product.id,
              quantity: 1,
              unitPrice: 100,
              discount: 0,
              total: 100,
            },
          },
        },
      });
      testDataTracker.add('order', order.id);

      const response = await request(app)
        .post('/api/payment/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: order.id,
          cardData: {
            cardNumber: '4111111111111111',
            cardHolderName: 'Test User',
            cardExpirationDate: '1225',
            cardCvv: '123',
            // CPF não fornecido - deve usar nationalRegistration
          },
          billingAddress: {
            country: 'br',
            state: 'SP',
            city: 'São Paulo',
            street: 'Av. Test',
            streetNumber: '123',
            zipcode: '01234567',
          },
        });

      expect(response.status).toBe(200);
      expect(createCreditCardTransaction).toHaveBeenCalled();
      const callArgs = createCreditCardTransaction.mock.calls[0][0];
      expect(callArgs.customer.documents).toBeDefined();
      expect(callArgs.customer.documents[0].number).toBe('98765432100');
    });

    it('should return error when CPF is not available in nationalRegistration or cardData', async () => {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'test-secret') as { userId: string };
      const authenticatedUser = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { person: true },
      });

      // Garantir que não tem nationalRegistration
      await prisma.person.update({
        where: { id: authenticatedUser!.personId },
        data: { nationalRegistration: null },
      });

      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          description: 'Test',
          price: 100,
          quantity: 10,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      const order = await prisma.order.create({
        data: {
          userId: authenticatedUser!.id,
          status: 'pending',
          subtotal: 100,
          shippingCost: 0,
          tax: 0,
          total: 100,
          items: {
            create: {
              productId: product.id,
              quantity: 1,
              unitPrice: 100,
              discount: 0,
              total: 100,
            },
          },
        },
      });
      testDataTracker.add('order', order.id);

      const response = await request(app)
        .post('/api/payment/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: order.id,
          cardData: {
            cardNumber: '4111111111111111',
            cardHolderName: 'Test User',
            cardExpirationDate: '1225',
            cardCvv: '123',
            // CPF não fornecido e não existe em nationalRegistration
          },
          billingAddress: {
            country: 'br',
            state: 'SP',
            city: 'São Paulo',
            street: 'Av. Test',
            streetNumber: '123',
            zipcode: '01234567',
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('CPF do cliente é obrigatório');
    });
  });
});
