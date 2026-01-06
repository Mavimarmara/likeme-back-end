import { orderService } from '@/services/order/orderService';
import prisma from '@/config/database';
import { safeTestCleanup, TestDataTracker } from '@/utils/test-helpers';
import { paymentSplitService } from '@/services/payment/paymentSplitService';

jest.setTimeout(30000);

// Mock do cliente Pagarme
jest.mock('@/clients/pagarme/pagarmeClient', () => ({
  getPagarmeClient: jest.fn(),
  createCreditCardTransaction: jest.fn(),
  getTransaction: jest.fn(),
  captureTransaction: jest.fn(),
  refundTransaction: jest.fn(),
}));

// Mock do paymentSplitService
jest.mock('@/services/payment/paymentSplitService', () => ({
  paymentSplitService: {
    calculateSplit: jest.fn(),
  },
}));

const testDataTracker = new TestDataTracker();

afterAll(async () => {
  await safeTestCleanup(testDataTracker, prisma);
  await prisma.$disconnect();
});

describe('OrderService - Split de Pagamento', () => {
  let testUser: any;
  let testProduct: any;
  const { createCreditCardTransaction } = require('@/clients/pagarme/pagarmeClient');

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const person = await prisma.person.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        nationalRegistration: '11144477735',
      },
    });
    testDataTracker.add('person', person.id);

    testUser = await prisma.user.create({
      data: {
        personId: person.id,
        username: `test-${uniqueId}@example.com`,
        password: 'hashed',
        isActive: true,
      },
    });
    testDataTracker.add('user', testUser.id);

    // Criar email contact
    await prisma.personContact.create({
      data: {
        personId: person.id,
        type: 'email',
        value: `test-${uniqueId}@example.com`,
      },
    });

    // Criar telefone contact
    await prisma.personContact.create({
      data: {
        personId: person.id,
        type: 'phone',
        value: '11999999999',
      },
    });

    // Criar produto
    testProduct = await prisma.product.create({
      data: {
        name: 'Test Product',
        description: 'Test',
        price: 100,
        quantity: 10,
        status: 'active',
      },
    });
    testDataTracker.add('product', testProduct.id);
  });

  describe('processPaymentForOrder com split', () => {
    it('deve enviar split para Pagarme quando split está configurado', async () => {
      // Mock do split service retornando split válido
      const mockSplit = [
        {
          type: 'percentage' as const,
          amount: 10, // 10%
          recipient_id: 're_test_recipient_123456789',
          options: {
            charge_processing_fee: false,
            charge_remainder_fee: false,
            liable: true,
          },
        },
      ];

      (paymentSplitService.calculateSplit as jest.Mock).mockResolvedValue(mockSplit);

      // Mock da resposta da Pagarme
      createCreditCardTransaction.mockResolvedValue({
        id: 'tran_test_split_123',
        status: 'captured',
        authorization_code: 'AUTH123',
      });


      // Dados do cartão
      const cardData = {
        cardNumber: '4000000000000002',
        cardHolderName: 'Test User',
        cardExpirationDate: '1226',
        cardCvv: '123',
        cpf: '11144477735',
        phone: '11999999999',
      };

      const billingAddress = {
        country: 'br',
        state: 'SP',
        city: 'São Paulo',
        street: 'Rua Teste',
        streetNumber: '123',
        zipcode: '01234567',
        neighborhood: 'Centro',
      };

      // Processar pagamento através do método create que chama processPaymentForOrder internamente
      const order = await orderService.create({
        userId: testUser.id,
        items: [{ productId: testProduct.id, quantity: 1, discount: 0 }],
        status: 'pending',
        shippingCost: 10,
        tax: 0,
        shippingAddress: 'Rua Teste, 123 - São Paulo, SP - 01234567',
        billingAddress: billingAddress,
        paymentMethod: 'credit_card',
        cardData: cardData,
      });

      testDataTracker.add('order', order.id);

      // Verificar se split foi calculado
      expect(paymentSplitService.calculateSplit).toHaveBeenCalledWith(
        expect.objectContaining({
          id: order.id,
        })
      );

      // Verificar se createCreditCardTransaction foi chamado com split
      expect(createCreditCardTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          split: mockSplit,
        })
      );

      // Verificar detalhes do split enviado
      const callArgs = createCreditCardTransaction.mock.calls[0][0];
      expect(callArgs.split).toBeDefined();
      expect(callArgs.split).toHaveLength(1);
      expect(callArgs.split[0]).toMatchObject({
        type: 'percentage',
        amount: 10,
        recipient_id: 're_test_recipient_123456789',
        options: {
          charge_processing_fee: false,
          charge_remainder_fee: false,
          liable: true,
        },
      });
    });

    it('não deve enviar split quando split service retorna null', async () => {
      // Mock do split service retornando null (split desabilitado)
      (paymentSplitService.calculateSplit as jest.Mock).mockResolvedValue(null);

      // Mock da resposta da Pagarme
      createCreditCardTransaction.mockResolvedValue({
        id: 'tran_test_no_split_123',
        status: 'captured',
        authorization_code: 'AUTH123',
      });


      // Dados do cartão
      const cardData = {
        cardNumber: '4000000000000002',
        cardHolderName: 'Test User',
        cardExpirationDate: '1226',
        cardCvv: '123',
        cpf: '11144477735',
        phone: '11999999999',
      };

      const billingAddress = {
        country: 'br',
        state: 'SP',
        city: 'São Paulo',
        street: 'Rua Teste',
        streetNumber: '123',
        zipcode: '01234567',
        neighborhood: 'Centro',
      };

      // Processar pagamento através do método create que chama processPaymentForOrder internamente
      const order = await orderService.create({
        userId: testUser.id,
        items: [{ productId: testProduct.id, quantity: 1, discount: 0 }],
        status: 'pending',
        shippingCost: 10,
        tax: 0,
        shippingAddress: 'Rua Teste, 123 - São Paulo, SP - 01234567',
        billingAddress: billingAddress,
        paymentMethod: 'credit_card',
        cardData: cardData,
      });

      testDataTracker.add('order', order.id);

      // Verificar se split foi calculado
      expect(paymentSplitService.calculateSplit).toHaveBeenCalled();

      // Verificar se createCreditCardTransaction foi chamado SEM split
      const callArgs = createCreditCardTransaction.mock.calls[0][0];
      expect(callArgs.split).toBeUndefined();
    });

    it('deve enviar múltiplos splits quando configurado', async () => {
      // Mock do split service retornando múltiplos splits
      const mockSplits = [
        {
          type: 'percentage' as const,
          amount: 5, // 5%
          recipient_id: 're_test_recipient_1',
          options: {
            charge_processing_fee: false,
            charge_remainder_fee: false,
            liable: true,
          },
        },
        {
          type: 'percentage' as const,
          amount: 3, // 3%
          recipient_id: 're_test_recipient_2',
          options: {
            charge_processing_fee: true,
            charge_remainder_fee: false,
            liable: false,
          },
        },
      ];

      (paymentSplitService.calculateSplit as jest.Mock).mockResolvedValue(mockSplits);

      // Mock da resposta da Pagarme
      createCreditCardTransaction.mockResolvedValue({
        id: 'tran_test_multiple_splits_123',
        status: 'captured',
        authorization_code: 'AUTH123',
      });


      // Dados do cartão
      const cardData = {
        cardNumber: '4000000000000002',
        cardHolderName: 'Test User',
        cardExpirationDate: '1226',
        cardCvv: '123',
        cpf: '11144477735',
        phone: '11999999999',
      };

      const billingAddress = {
        country: 'br',
        state: 'SP',
        city: 'São Paulo',
        street: 'Rua Teste',
        streetNumber: '123',
        zipcode: '01234567',
        neighborhood: 'Centro',
      };

      // Processar pagamento através do método create que chama processPaymentForOrder internamente
      await orderService.create({
        userId: testUser.id,
        items: [{ productId: testProduct.id, quantity: 1, discount: 0 }],
        status: 'pending',
        shippingCost: 10,
        tax: 0,
        shippingAddress: 'Rua Teste, 123 - São Paulo, SP - 01234567',
        billingAddress: billingAddress,
        paymentMethod: 'credit_card',
        cardData: cardData,
      });

      // Verificar se createCreditCardTransaction foi chamado com múltiplos splits
      const callArgs = createCreditCardTransaction.mock.calls[0][0];
      expect(callArgs.split).toBeDefined();
      expect(callArgs.split).toHaveLength(2);
      expect(callArgs.split[0]).toMatchObject({
        type: 'percentage',
        amount: 5,
        recipient_id: 're_test_recipient_1',
      });
      expect(callArgs.split[1]).toMatchObject({
        type: 'percentage',
        amount: 3,
        recipient_id: 're_test_recipient_2',
      });
    });

    it('deve enviar split com tipo flat quando configurado', async () => {
      // Mock do split service retornando split tipo flat
      const mockSplit = [
        {
          type: 'flat' as const,
          amount: 500, // R$ 5,00 em centavos
          recipient_id: 're_test_recipient_flat',
          options: {
            charge_processing_fee: false,
            charge_remainder_fee: false,
            liable: true,
          },
        },
      ];

      (paymentSplitService.calculateSplit as jest.Mock).mockResolvedValue(mockSplit);

      // Mock da resposta da Pagarme
      createCreditCardTransaction.mockResolvedValue({
        id: 'tran_test_flat_split_123',
        status: 'captured',
        authorization_code: 'AUTH123',
      });


      // Dados do cartão
      const cardData = {
        cardNumber: '4000000000000002',
        cardHolderName: 'Test User',
        cardExpirationDate: '1226',
        cardCvv: '123',
        cpf: '11144477735',
        phone: '11999999999',
      };

      const billingAddress = {
        country: 'br',
        state: 'SP',
        city: 'São Paulo',
        street: 'Rua Teste',
        streetNumber: '123',
        zipcode: '01234567',
        neighborhood: 'Centro',
      };

      // Processar pagamento através do método create que chama processPaymentForOrder internamente
      await orderService.create({
        userId: testUser.id,
        items: [{ productId: testProduct.id, quantity: 1, discount: 0 }],
        status: 'pending',
        shippingCost: 10,
        tax: 0,
        shippingAddress: 'Rua Teste, 123 - São Paulo, SP - 01234567',
        billingAddress: billingAddress,
        paymentMethod: 'credit_card',
        cardData: cardData,
      });

      // Verificar se createCreditCardTransaction foi chamado com split tipo flat
      const callArgs = createCreditCardTransaction.mock.calls[0][0];
      expect(callArgs.split).toBeDefined();
      expect(callArgs.split[0]).toMatchObject({
        type: 'flat',
        amount: 500,
        recipient_id: 're_test_recipient_flat',
      });
    });
  });
});

