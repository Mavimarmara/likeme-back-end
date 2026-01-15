import { orderService, OrderAuthorizationError } from '@/services/order/orderService';
import prisma from '@/config/database';
import { safeTestCleanup, TestDataTracker } from '@/utils/test-helpers';
import { createValidProduct } from '@/tests/fixtures/testFixtures';

jest.setTimeout(30000);

const testDataTracker = new TestDataTracker();

afterAll(async () => {
  await safeTestCleanup(testDataTracker, prisma);
  await prisma.$disconnect();
});

describe('OrderService - CRUD operations', () => {
  let testUser: any;
  let testProduct: any;
  let testOrder: any;

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

    testProduct = await prisma.product.create({
      data: createValidProduct({
        name: 'Test Product',
        description: 'Test',
      }),
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

  describe('findById', () => {
    it('should find order by id', async () => {
      const order = await orderService.findById(testOrder.id, testUser.id);
      expect(order).toBeDefined();
      expect(order?.id).toBe(testOrder.id);
    });

    it('should return null for non-existent order', async () => {
      const order = await orderService.findById('non-existent-id', testUser.id);
      expect(order).toBeNull();
    });

    it('should throw authorization error when user does not own order', async () => {
      const anotherUser = await prisma.user.create({
        data: {
          personId: (await prisma.person.create({
            data: { firstName: 'Another', lastName: 'User' },
          })).id,
          username: `another-${Date.now()}@example.com`,
          password: 'hashed',
          isActive: true,
        },
      });
      testDataTracker.add('user', anotherUser.id);

      await expect(
        orderService.findById(testOrder.id, anotherUser.id)
      ).rejects.toThrow(OrderAuthorizationError);
    });
  });

  describe('findAll', () => {
    it('should find all orders', async () => {
      const orders = await orderService.findAll(testUser.id);
      expect(orders.length).toBeGreaterThan(0);
      expect(orders[0].userId).toBe(testUser.id);
    });

    it('should filter by status', async () => {
      const orders = await orderService.findAll(testUser.id, 'pending');
      expect(orders.length).toBeGreaterThan(0);
      orders.forEach(order => expect(order.status).toBe('pending'));
    });
  });

  describe('update', () => {
    it('should update order', async () => {
      const updated = await orderService.update(testOrder.id, testUser.id, {
        status: 'completed',
      });
      expect(updated.status).toBe('completed');
    });

    it('should throw error when order not found', async () => {
      await expect(
        orderService.update('non-existent-id', testUser.id, { status: 'completed' })
      ).rejects.toThrow('Order not found');
    });
  });

  describe('cancel', () => {
    it('should cancel order and restore stock', async () => {
      const initialQuantity = testProduct.quantity;

      await orderService.cancel(testOrder.id, testUser.id);

      const cancelledOrder = await prisma.order.findUnique({
        where: { id: testOrder.id },
      });
      expect(cancelledOrder?.status).toBe('cancelled');

      const updatedProduct = await prisma.product.findUnique({
        where: { id: testProduct.id },
      });
      expect(updatedProduct?.quantity).toBe(initialQuantity + 1);
    });

    it('should throw error when order already cancelled', async () => {
      await orderService.cancel(testOrder.id, testUser.id);
      await expect(
        orderService.cancel(testOrder.id, testUser.id)
      ).rejects.toThrow('already been cancelled');
    });
  });

  describe('delete', () => {
    it('should soft delete order', async () => {
      await orderService.delete(testOrder.id, testUser.id, false);

      const deletedOrder = await prisma.order.findUnique({
        where: { id: testOrder.id },
      });
      expect(deletedOrder?.deletedAt).not.toBeNull();
    });

    it('should restore stock when restoreStock is true', async () => {
      const initialQuantity = testProduct.quantity;

      await orderService.delete(testOrder.id, testUser.id, true);

      const updatedProduct = await prisma.product.findUnique({
        where: { id: testProduct.id },
      });
      expect(updatedProduct?.quantity).toBe(initialQuantity + 1);
    });
  });
});

