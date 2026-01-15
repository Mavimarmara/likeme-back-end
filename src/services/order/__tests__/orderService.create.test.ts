import { orderService } from '@/services/order/orderService';
import prisma from '@/config/database';
import { safeTestCleanup, TestDataTracker } from '@/utils/test-helpers';
import { createValidProduct, createValidCardData, createValidAddress } from '@/tests/fixtures/testFixtures';

jest.setTimeout(30000);

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

describe('OrderService - create', () => {
  let testUser: any;
  let testProduct: any;

  beforeEach(async () => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const person = await prisma.person.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        nationalRegistration: '12345678901',
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

    const emailContact = await prisma.personContact.create({
      data: {
        personId: person.id,
        type: 'email',
        value: `test-${uniqueId}@example.com`,
      },
    });
    testDataTracker.add('personContact', emailContact.id);

    testProduct = await prisma.product.create({
      data: createValidProduct({
        name: 'Test Product',
        description: 'Test',
      }),
    });
    testDataTracker.add('product', testProduct.id);
  });

  describe('create', () => {
    const { createCreditCardTransaction } = require('@/clients/pagarme/pagarmeClient');

    beforeEach(() => {
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
        cardData: createValidCardData(),
        billingAddress: createValidAddress(),
      };

      const order = await orderService.create(orderData);

      expect(order).toBeDefined();
      expect(order.userId).toBe(testUser.id);
      expect((order as any).items?.length).toBeGreaterThanOrEqual(1);
      expect(order.total.toString()).toBe('210');
      expect(order.paymentStatus).toBe('paid');
      expect((order as any).paymentTransactionId).toBeDefined();
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
        data: createValidProduct({
          name: 'Stock Revert Payment Test',
          description: 'Test',
          price: 50,
          quantity: initialQuantity,
        }),
      });
      testDataTracker.add('product', product.id);

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
        cardData: createValidCardData(),
        billingAddress: createValidAddress(),
      };

      await expect(orderService.create(orderData)).rejects.toThrow();

      const updatedProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(updatedProduct?.quantity).toBe(initialQuantity);
    });

    it('should handle refused transaction and revert stock', async () => {
      const initialQuantity = 20;
      const product = await prisma.product.create({
        data: createValidProduct({
          name: 'Refused Transaction Test',
          description: 'Test',
          price: 75,
          quantity: initialQuantity,
        }),
      });
      testDataTracker.add('product', product.id);

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
        cardData: createValidCardData(),
        billingAddress: createValidAddress(),
      };

      await expect(orderService.create(orderData)).rejects.toThrow('Pagamento recusado');

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
        data: createValidProduct({
          name: 'No Price Product',
          price: null,
        }),
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
            discount: 0,
          },
        ],
        status: 'pending' as const,
        shippingCost: 10,
        tax: 0,
        cardData: createValidCardData(),
        billingAddress: createValidAddress(),
      };

      const order = await orderService.create(orderData);
      testDataTracker.add('order', order.id);
      if ((order as any).items) {
        (order as any).items.forEach((item: any) => {
          if (item.id) testDataTracker.add('orderItem', item.id);
        });
      }

      const productAfter = await prisma.product.findUnique({
        where: { id: testProduct.id },
      });

      expect(productAfter?.quantity).toBe((productBefore?.quantity ?? 0) - 3);
    });
  });
});

