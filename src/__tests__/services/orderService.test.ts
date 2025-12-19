import { orderService, OrderAuthorizationError } from '@/services/orderService';
import prisma from '@/config/database';
import { safeTestCleanup, TestDataTracker } from '@/utils/test-helpers';

jest.setTimeout(30000);

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
    const person = await prisma.person.create({
      data: { firstName: 'Test', lastName: 'User' },
    });
    testDataTracker.add('person', person.id);

    testUser = await prisma.user.create({
      data: {
        personId: person.id,
        username: `test${Date.now()}@example.com`,
        password: 'hashed',
        isActive: true,
      },
    });
    testDataTracker.add('user', testUser.id);

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
    it('should create order', async () => {
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
      };

      const order = await orderService.create(orderData);

      expect(order).toBeDefined();
      expect(order.userId).toBe(testUser.id);
      expect((order as any).items?.length).toBeGreaterThanOrEqual(1);
      expect(order.total.toString()).toBe('210');

      testDataTracker.add('order', order.id);
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
