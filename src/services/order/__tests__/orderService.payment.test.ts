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

describe('OrderService - processPaymentForOrder (CPF handling)', () => {
  const { createCreditCardTransaction } = require('@/clients/pagarme/pagarmeClient');

  beforeEach(() => {
    createCreditCardTransaction.mockClear();
    createCreditCardTransaction.mockResolvedValue({
      id: 'trans_test_123',
      status: 'paid',
      authorization_code: 'AUTH123',
    });
  });

  it('should use CPF from nationalRegistration when available', async () => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const person = await prisma.person.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        nationalRegistration: '12345678901',
      },
    });
    testDataTracker.add('person', person.id);

    const user = await prisma.user.create({
      data: {
        personId: person.id,
        username: `test-${uniqueId}@example.com`,
        password: 'hashed',
        isActive: true,
      },
    });
    testDataTracker.add('user', user.id);

    const emailContact = await prisma.personContact.create({
      data: {
        personId: person.id,
        type: 'email',
        value: `test-${uniqueId}@example.com`,
      },
    });
    testDataTracker.add('personContact', emailContact.id);

    const product = await prisma.product.create({
      data: createValidProduct({
        name: 'Test Product',
        description: 'Test',
      }),
    });
    testDataTracker.add('product', product.id);

    const orderData = {
      userId: user.id,
      items: [{ productId: product.id, quantity: 1, discount: 0 }],
      status: 'pending' as const,
      shippingCost: 0,
      tax: 0,
      cardData: createValidCardData(),
      billingAddress: createValidAddress(),
    };

    const order = await orderService.create(orderData);
    testDataTracker.add('order', order.id);

    expect(createCreditCardTransaction).toHaveBeenCalled();
    const callArgs = createCreditCardTransaction.mock.calls[0][0];
    expect(callArgs.customer.documents).toBeDefined();
    expect(callArgs.customer.documents[0].number).toBe('12345678901');
  });

  it('should use CPF from cardData when provided', async () => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const person = await prisma.person.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        nationalRegistration: '11122233344',
      },
    });
    testDataTracker.add('person', person.id);

    const user = await prisma.user.create({
      data: {
        personId: person.id,
        username: `test-${uniqueId}@example.com`,
        password: 'hashed',
        isActive: true,
      },
    });
    testDataTracker.add('user', user.id);

    const emailContact = await prisma.personContact.create({
      data: {
        personId: person.id,
        type: 'email',
        value: `test-${uniqueId}@example.com`,
      },
    });
    testDataTracker.add('personContact', emailContact.id);

    const product = await prisma.product.create({
      data: createValidProduct({
        name: 'Test Product',
        description: 'Test',
      }),
    });
    testDataTracker.add('product', product.id);

    const orderData = {
      userId: user.id,
      items: [{ productId: product.id, quantity: 1, discount: 0 }],
      status: 'pending' as const,
      shippingCost: 0,
      tax: 0,
      cardData: {
        ...createValidCardData(),
        cpf: '99988877766',
      },
      billingAddress: createValidAddress(),
    };

    const order = await orderService.create(orderData);
    testDataTracker.add('order', order.id);

    expect(createCreditCardTransaction).toHaveBeenCalled();
    const callArgs = createCreditCardTransaction.mock.calls[0][0];
    expect(callArgs.customer.documents).toBeDefined();
    expect(callArgs.customer.documents[0].number).toBe('99988877766');
  });

  it('should fallback to nationalRegistration when CPF is not in cardData', async () => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const person = await prisma.person.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        nationalRegistration: '12345678901',
      },
    });
    testDataTracker.add('person', person.id);

    const user = await prisma.user.create({
      data: {
        personId: person.id,
        username: `test-${uniqueId}@example.com`,
        password: 'hashed',
        isActive: true,
      },
    });
    testDataTracker.add('user', user.id);

    const emailContact = await prisma.personContact.create({
      data: {
        personId: person.id,
        type: 'email',
        value: `test-${uniqueId}@example.com`,
      },
    });
    testDataTracker.add('personContact', emailContact.id);

    const product = await prisma.product.create({
      data: createValidProduct({
        name: 'Test Product',
        description: 'Test',
      }),
    });
    testDataTracker.add('product', product.id);

    const orderData = {
      userId: user.id,
      items: [{ productId: product.id, quantity: 1, discount: 0 }],
      status: 'pending' as const,
      shippingCost: 0,
      tax: 0,
      cardData: createValidCardData(),
      billingAddress: createValidAddress(),
    };

    const order = await orderService.create(orderData);
    testDataTracker.add('order', order.id);

    expect(createCreditCardTransaction).toHaveBeenCalled();
    const callArgs = createCreditCardTransaction.mock.calls[0][0];
    expect(callArgs.customer.documents).toBeDefined();
    expect(callArgs.customer.documents[0].number).toBe('12345678901');
  });

  it('should throw error when CPF is not available in nationalRegistration or cardData', async () => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const person = await prisma.person.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        nationalRegistration: null,
      },
    });
    testDataTracker.add('person', person.id);

    const user = await prisma.user.create({
      data: {
        personId: person.id,
        username: `test-${uniqueId}@example.com`,
        password: 'hashed',
        isActive: true,
      },
    });
    testDataTracker.add('user', user.id);

    const emailContact = await prisma.personContact.create({
      data: {
        personId: person.id,
        type: 'email',
        value: `test-${uniqueId}@example.com`,
      },
    });
    testDataTracker.add('personContact', emailContact.id);

    const product = await prisma.product.create({
      data: createValidProduct({
        name: 'Test Product',
        description: 'Test',
      }),
    });
    testDataTracker.add('product', product.id);

    const orderData = {
      userId: user.id,
      items: [{ productId: product.id, quantity: 1, discount: 0 }],
      status: 'pending' as const,
      shippingCost: 0,
      tax: 0,
      cardData: createValidCardData(),
      billingAddress: createValidAddress(),
    };

    await expect(orderService.create(orderData)).rejects.toThrow('CPF is required');
  });
});

