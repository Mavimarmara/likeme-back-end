import { orderService } from '@/services/order/orderService';
import prisma from '@/config/database';
import { safeTestCleanup, TestDataTracker } from '@/utils/test-helpers';
import { createValidProduct } from '@/tests/fixtures/testFixtures';

jest.setTimeout(30000);

const testDataTracker = new TestDataTracker();

afterAll(async () => {
  await safeTestCleanup(testDataTracker, prisma);
  await prisma.$disconnect();
});

describe('OrderService - validateCartItems', () => {
  let testProduct: any;

  beforeEach(async () => {
    testProduct = await prisma.product.create({
      data: createValidProduct({
        name: 'Test Product',
        description: 'Test',
      }),
    });
    testDataTracker.add('product', testProduct.id);
  });

  it('should return valid items when all products exist and have stock', async () => {
    const items = [
      { productId: testProduct.id, quantity: 2, discount: 0 },
    ];

    const result = await orderService.validateCartItems(items);

    expect(result.validItems).toHaveLength(1);
    expect(result.invalidItems).toHaveLength(0);
    expect(result.validItems[0].productId).toBe(testProduct.id);
  });

  it('should identify products that do not exist', async () => {
    const items = [
      { productId: 'non-existent-id', quantity: 1, discount: 0 },
    ];

    const result = await orderService.validateCartItems(items);

    expect(result.validItems).toHaveLength(0);
    expect(result.invalidItems).toHaveLength(1);
    expect(result.invalidItems[0].productId).toBe('non-existent-id');
    expect(result.invalidItems[0].reason).toBe('not_found');
  });

  it('should identify products that are out of stock', async () => {
    const outOfStockProduct = await prisma.product.create({
      data: createValidProduct({
        name: 'Out of Stock Product',
        description: 'Test',
        quantity: 0,
      }),
    });
    testDataTracker.add('product', outOfStockProduct.id);

    const items = [
      { productId: outOfStockProduct.id, quantity: 1, discount: 0 },
    ];

    const result = await orderService.validateCartItems(items);

    expect(result.validItems).toHaveLength(0);
    expect(result.invalidItems).toHaveLength(1);
    expect(result.invalidItems[0].productId).toBe(outOfStockProduct.id);
    expect(result.invalidItems[0].reason).toBe('out_of_stock');
    expect(result.invalidItems[0].availableQuantity).toBe(0);
  });

  it('should identify products with insufficient stock', async () => {
    const lowStockProduct = await prisma.product.create({
      data: createValidProduct({
        name: 'Low Stock Product',
        description: 'Test',
        quantity: 2,
      }),
    });
    testDataTracker.add('product', lowStockProduct.id);

    const items = [
      { productId: lowStockProduct.id, quantity: 5, discount: 0 },
    ];

    const result = await orderService.validateCartItems(items);

    expect(result.validItems).toHaveLength(0);
    expect(result.invalidItems).toHaveLength(1);
    expect(result.invalidItems[0].productId).toBe(lowStockProduct.id);
    expect(result.invalidItems[0].reason).toBe('insufficient_stock');
    expect(result.invalidItems[0].availableQuantity).toBe(2);
    expect(result.invalidItems[0].requestedQuantity).toBe(5);
  });

  it('should identify products with external URL', async () => {
    const externalProduct = await prisma.product.create({
      data: {
        name: 'External Product',
        description: 'Test',
        price: 50,
        quantity: 10,
        status: 'active',
        externalUrl: 'https://example.com/product',
      },
    });
    testDataTracker.add('product', externalProduct.id);

    const items = [
      { productId: externalProduct.id, quantity: 1, discount: 0 },
    ];

    const result = await orderService.validateCartItems(items);

    expect(result.validItems).toHaveLength(0);
    expect(result.invalidItems).toHaveLength(1);
    expect(result.invalidItems[0].productId).toBe(externalProduct.id);
    expect(result.invalidItems[0].reason).toBe('external_url');
  });

  it('should identify inactive products', async () => {
    const inactiveProduct = await prisma.product.create({
      data: createValidProduct({
        name: 'Inactive Product',
        description: 'Test',
        status: 'inactive',
      }),
    });
    testDataTracker.add('product', inactiveProduct.id);

    const items = [
      { productId: inactiveProduct.id, quantity: 1, discount: 0 },
    ];

    const result = await orderService.validateCartItems(items);

    expect(result.validItems).toHaveLength(0);
    expect(result.invalidItems).toHaveLength(1);
    expect(result.invalidItems[0].productId).toBe(inactiveProduct.id);
    expect(result.invalidItems[0].reason).toBe('inactive');
  });

  it('should identify products without price', async () => {
    const noPriceProduct = await prisma.product.create({
      data: createValidProduct({
        name: 'No Price Product',
        description: 'Test',
        price: null,
      }),
    });
    testDataTracker.add('product', noPriceProduct.id);

    const items = [
      { productId: noPriceProduct.id, quantity: 1, discount: 0 },
    ];

    const result = await orderService.validateCartItems(items);

    expect(result.validItems).toHaveLength(0);
    expect(result.invalidItems).toHaveLength(1);
    expect(result.invalidItems[0].productId).toBe(noPriceProduct.id);
    expect(result.invalidItems[0].reason).toBe('no_price');
  });

  it('should handle mixed valid and invalid items', async () => {
    const validProduct = await prisma.product.create({
      data: createValidProduct({
        name: 'Valid Product',
        description: 'Test',
      }),
    });
    testDataTracker.add('product', validProduct.id);

    const items = [
      { productId: testProduct.id, quantity: 2, discount: 0 },
      { productId: 'non-existent-id', quantity: 1, discount: 0 },
      { productId: validProduct.id, quantity: 1, discount: 0 },
    ];

    const result = await orderService.validateCartItems(items);

    expect(result.validItems).toHaveLength(2);
    expect(result.invalidItems).toHaveLength(1);
    expect(result.validItems.map(i => i.productId)).toContain(testProduct.id);
    expect(result.validItems.map(i => i.productId)).toContain(validProduct.id);
    expect(result.invalidItems[0].productId).toBe('non-existent-id');
  });
});

