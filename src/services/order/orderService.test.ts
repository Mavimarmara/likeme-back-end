import { orderService, OrderAuthorizationError } from '@/services/order/orderService';
import prisma from '@/config/database';
import { safeTestCleanup, TestDataTracker } from '@/utils/test-helpers';

jest.setTimeout(30000);

// Mock do cliente Pagarme
jest.mock('@/clients/pagarme/pagarmeClient', () => ({
  getPagarmeClient: jest.fn(),
  createCreditCardTransaction: jest.fn(),
  getTransaction: jest.fn(),
  captureTransaction: jest.fn(),
  refundTransaction: jest.fn(),
}));

const testDataTracker = new TestDataTracker();

afterAll(async () => {
  await safeTestCleanup(testDataTracker, prisma);
  await prisma.$disconnect();
});

describe('OrderService', () => {
  let testUser: any;
  let testProduct: any;
  let testOrder: any;

  beforeEach(async () => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const person = await prisma.person.create({
      data: { firstName: 'Test', lastName: 'User' },
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

    // Criar email contact (necessário para processar pagamento)
    const emailContact = await prisma.personContact.create({
      data: {
        personId: person.id,
        type: 'email',
        value: `test-${uniqueId}@example.com`,
      },
    });
    testDataTracker.add('personContact', emailContact.id);

    // Criar CPF contact (OBRIGATÓRIO para Pagarme - tipo individual)
    const cpfContact = await prisma.personContact.create({
      data: {
        personId: person.id,
        type: 'cpf',
        value: '12345678901', // CPF de teste válido
      },
    });
    testDataTracker.add('personContact', cpfContact.id);

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

    testOrder = await prisma.order.create({
      data: {
        userId: testUser.id,
        status: 'pending',
        subtotal: 100,
        shippingCost: 10,
        tax: 0,
        total: 110,
        items: {
          create: {
            productId: testProduct.id,
            quantity: 1,
            unitPrice: 100,
            discount: 0,
            total: 100,
          },
        },
      },
    });
    testDataTracker.add('order', testOrder.id);
  });

  describe('create', () => {
    const { createCreditCardTransaction } = require('@/clients/pagarme/pagarmeClient');

    beforeEach(() => {
      // Mock padrão: pagamento bem-sucedido
      createCreditCardTransaction.mockClear();
      createCreditCardTransaction.mockResolvedValue({
        id: 'trans_test_123',
        status: 'paid',
        authorization_code: 'AUTH123',
      });
    });

    it('should create order and process payment', async () => {
      const orderData = {
        userId: testUser.id,
        items: [
          {
            productId: testProduct.id,
            quantity: 2,
            discount: 0,
          },
        ],
        status: 'pending' as const,
        shippingCost: 10,
        tax: 0,
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
          street: 'Av. Test',
          streetNumber: '123',
          zipcode: '01234567',
        },
      };

      const order = await orderService.create(orderData);

      expect(order).toBeDefined();
      expect(order.userId).toBe(testUser.id);
      expect((order as any).items?.length).toBeGreaterThanOrEqual(1);
      expect(order.total.toString()).toBe('210');
      expect(order.paymentStatus).toBe('paid');
      expect((order as any).paymentTransactionId).toBeDefined();

      // Verificar que createCreditCardTransaction foi chamado
      expect(createCreditCardTransaction).toHaveBeenCalled();

      testDataTracker.add('order', order.id);
      if ((order as any).items) {
        (order as any).items.forEach((item: any) => {
          if (item.id) testDataTracker.add('orderItem', item.id);
        });
      }
    });

    it('should revert stock when payment fails', async () => {
      const initialQuantity = 15;
      const product = await prisma.product.create({
        data: {
          name: 'Stock Revert Payment Test',
          description: 'Test',
          price: 50,
          quantity: initialQuantity,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      // Mock para simular falha no pagamento
      createCreditCardTransaction.mockRejectedValueOnce(new Error('Payment failed'));

      const orderData = {
        userId: testUser.id,
        items: [
          {
            productId: product.id,
            quantity: 3,
            discount: 0,
          },
        ],
        status: 'pending' as const,
        shippingCost: 0,
        tax: 0,
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
          street: 'Av. Test',
          streetNumber: '123',
          zipcode: '01234567',
        },
      };

      await expect(orderService.create(orderData)).rejects.toThrow();

      // Verificar que o estoque foi revertido
      const updatedProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(updatedProduct?.quantity).toBe(initialQuantity);
    });

    it('should handle refused transaction and revert stock', async () => {
      const initialQuantity = 20;
      const product = await prisma.product.create({
        data: {
          name: 'Refused Transaction Test',
          description: 'Test',
          price: 75,
          quantity: initialQuantity,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      // Mock para retornar status refused
      createCreditCardTransaction.mockResolvedValueOnce({
        id: 'trans_refused_test',
        status: 'refused',
      });

      const orderData = {
        userId: testUser.id,
        items: [
          {
            productId: product.id,
            quantity: 4,
            discount: 0,
          },
        ],
        status: 'pending' as const,
        shippingCost: 0,
        tax: 0,
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
          street: 'Av. Test',
          streetNumber: '123',
          zipcode: '01234567',
        },
      };

      await expect(orderService.create(orderData)).rejects.toThrow('Pagamento recusado');

      // Verificar que o estoque foi revertido
      const updatedProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(updatedProduct?.quantity).toBe(initialQuantity);
    });

    it('should throw error when user not found', async () => {
      const orderData = {
        userId: 'non-existent-id',
        items: [
          {
            productId: testProduct.id,
            quantity: 1,
          },
        ],
      };

      await expect(orderService.create(orderData)).rejects.toThrow('User not found');
    });

    it('should throw error when product not found', async () => {
      const orderData = {
        userId: testUser.id,
        items: [
          {
            productId: 'non-existent-id',
            quantity: 1,
          },
        ],
      };

      await expect(orderService.create(orderData)).rejects.toThrow('not found');
    });

    it('should throw error for products with externalUrl', async () => {
      const externalProduct = await prisma.product.create({
        data: {
          name: 'External Product',
          externalUrl: 'https://example.com/product',
          status: 'active',
        },
      });
      testDataTracker.add('product', externalProduct.id);

      const orderData = {
        userId: testUser.id,
        items: [
          {
            productId: externalProduct.id,
            quantity: 1,
          },
        ],
      };

      await expect(orderService.create(orderData)).rejects.toThrow('external URL');
    });

    it('should throw error for products without price', async () => {
      const noPriceProduct = await prisma.product.create({
        data: {
          name: 'No Price Product',
          price: null,
          quantity: 10,
          status: 'active',
        },
      });
      testDataTracker.add('product', noPriceProduct.id);

      const orderData = {
        userId: testUser.id,
        items: [
          {
            productId: noPriceProduct.id,
            quantity: 1,
          },
        ],
      };

      await expect(orderService.create(orderData)).rejects.toThrow('does not have a price');
    });

    it('should throw error for insufficient stock', async () => {
      const orderData = {
        userId: testUser.id,
        items: [
          {
            productId: testProduct.id,
            quantity: 100,
          },
        ],
      };

      await expect(orderService.create(orderData)).rejects.toThrow('Insufficient stock');
    });

    it('should decrease product stock when order is created', async () => {
      const productBefore = await prisma.product.findUnique({
        where: { id: testProduct.id },
      });

      const orderData = {
        userId: testUser.id,
        items: [
          {
            productId: testProduct.id,
            quantity: 3,
          },
        ],
      };

      await orderService.create(orderData);

      const productAfter = await prisma.product.findUnique({
        where: { id: testProduct.id },
      });

      expect(productAfter?.quantity).toBe((productBefore?.quantity ?? 0) - 3);
    });
  });

  describe('findById', () => {
    it('should find order by id', async () => {
      const order = await orderService.findById(testOrder.id);

      expect(order).toBeDefined();
      expect(order?.id).toBe(testOrder.id);
    });

    it('should return null for non-existent order', async () => {
      const order = await orderService.findById('non-existent-id');

      expect(order).toBeNull();
    });

    it('should throw authorization error when user does not own order', async () => {
      const otherUserPerson = await prisma.person.create({
        data: { firstName: 'Other', lastName: 'User' },
      });
      testDataTracker.add('person', otherUserPerson.id);

      const otherUser = await prisma.user.create({
        data: {
          personId: otherUserPerson.id,
          username: `other${Date.now()}@example.com`,
          password: 'hashed',
          isActive: true,
        },
      });
      testDataTracker.add('user', otherUser.id);

      await expect(orderService.findById(testOrder.id, otherUser.id)).rejects.toThrow(
        OrderAuthorizationError
      );
    });
  });

  describe('findAll', () => {
    it('should find all orders', async () => {
      const result = await orderService.findAll(1, 10, {}, testUser.id);

      expect(result.orders).toBeDefined();
      expect(Array.isArray(result.orders)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter by status', async () => {
      const result = await orderService.findAll(1, 10, { status: 'pending' }, testUser.id);

      expect(result.orders.length).toBeGreaterThan(0);
      result.orders.forEach((order) => {
        expect(order.status).toBe('pending');
      });
    });
  });

  describe('update', () => {
    it('should update order', async () => {
      const updateData = {
        status: 'completed' as const,
      };

      const updatedOrder = await orderService.update(testOrder.id, updateData, testUser.id);

      expect(updatedOrder.status).toBe('completed');
    });

    it('should throw error when order not found', async () => {
      await expect(
        orderService.update('non-existent-id', { status: 'pending' }, testUser.id)
      ).rejects.toThrow('Order not found');
    });
  });

  describe('cancel', () => {
    it('should cancel order and restore stock', async () => {
      const productBefore = await prisma.product.findUnique({
        where: { id: testProduct.id },
      });

      const cancelledOrder = await orderService.cancel(testOrder.id, testUser.id);

      expect(cancelledOrder.status).toBe('cancelled');

      const productAfter = await prisma.product.findUnique({
        where: { id: testProduct.id },
      });

      expect(productAfter?.quantity).toBe((productBefore?.quantity ?? 0) + 1);
    });

    it('should throw error when order already cancelled', async () => {
      await orderService.cancel(testOrder.id, testUser.id);

      await expect(orderService.cancel(testOrder.id, testUser.id)).rejects.toThrow(
        'already cancelled'
      );
    });
  });

  describe('delete', () => {
    it('should soft delete order', async () => {
      await orderService.delete(testOrder.id, testUser.id);

      const deletedOrder = await prisma.order.findUnique({
        where: { id: testOrder.id },
      });

      expect(deletedOrder?.deletedAt).toBeDefined();
    });

    it('should restore stock when restoreStock is true', async () => {
      const productBefore = await prisma.product.findUnique({
        where: { id: testProduct.id },
      });

      await orderService.delete(testOrder.id, testUser.id, true);

      const productAfter = await prisma.product.findUnique({
        where: { id: testProduct.id },
      });

      expect(productAfter?.quantity).toBe((productBefore?.quantity ?? 0) + 1);
    });
  });
});
