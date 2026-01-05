import request from 'supertest';
import app from '@/server';
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

beforeAll(async () => {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  NODE_ENV não está definido como "test". Os testes podem afetar o banco de dados de desenvolvimento!');
  }
});

// Tracker global para rastrear IDs criados durante os testes
const testDataTracker = new TestDataTracker();

afterAll(async () => {
  await safeTestCleanup(testDataTracker, prisma);
  await prisma.$disconnect();
});

// Helper para criar um token de teste
const createTestToken = async (): Promise<string> => {
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const person = await prisma.person.create({
    data: {
      firstName: 'Test',
      lastName: 'User',
    },
  });
  testDataTracker.add('person', person.id);

  const user = await prisma.user.create({
    data: {
      personId: person.id,
      username: `test-${uniqueId}@example.com`,
      password: 'hashedpassword',
      isActive: true,
    },
  });
  testDataTracker.add('user', user.id);

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

  const jwt = require('jsonwebtoken');
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
};

describe('Order Endpoints', () => {
  let authToken: string;
  let testUser: any;
  let testProduct: any;
  const { createCreditCardTransaction } = require('@/clients/pagarme/pagarmeClient');

  beforeAll(async () => {
    authToken = await createTestToken();

    // Buscar o usuário do token
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

    // Mock da Pagarme para retornar transação bem-sucedida
    createCreditCardTransaction.mockResolvedValue({
      id: 'trans_123456',
      status: 'paid',
      authorization_code: 'AUTH123',
    });

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
  });

  describe('POST /api/orders', () => {
    beforeEach(() => {
      // Reset mock antes de cada teste
      createCreditCardTransaction.mockClear();
      createCreditCardTransaction.mockResolvedValue({
        id: 'trans_123456',
        status: 'paid',
        authorization_code: 'AUTH123',
      });
    });

    it('should create a new order', async () => {
      const orderData = {
        items: [
          {
            productId: testProduct.id,
            quantity: 2,
          },
        ],
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
          street: 'Av. Paulista',
          streetNumber: '1000',
          zipcode: '01310000',
        },
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toBeDefined();
      expect(response.body.data.items.length).toBe(1);
      
      // Rastrear order e items criados pela API
      if (response.body.data?.id) {
        testDataTracker.add('order', response.body.data.id);
      }
      if (response.body.data?.items) {
        response.body.data.items.forEach((item: any) => {
          if (item.id) testDataTracker.add('orderItem', item.id);
        });
      }
    });

    it('should decrease product stock when order is created', async () => {
      const initialQuantity = 50;
      const orderQuantity = 5;

      const product = await prisma.product.create({
        data: {
          name: 'Stock Test Product',
          price: 10.99,
          quantity: initialQuantity,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      const orderData = {
        items: [
          {
            productId: product.id,
            quantity: orderQuantity,
          },
        ],
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
          street: 'Av. Paulista',
          streetNumber: '1000',
          zipcode: '01310000',
        },
      };

      const createResponse = await request(app)
        .post('/api/orders')
        .send(orderData)
        .set('Authorization', `Bearer ${authToken}`);
      
      // Rastrear order e items criados pela API
      if (createResponse.body.data?.id) {
        testDataTracker.add('order', createResponse.body.data.id);
      }
      if (createResponse.body.data?.items) {
        createResponse.body.data.items.forEach((item: any) => {
          if (item.id) testDataTracker.add('orderItem', item.id);
        });
      }

      const updatedProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });

      expect(updatedProduct?.quantity).toBe(initialQuantity - orderQuantity);
    });

    it('should validate required fields', async () => {
      const orderData = {
        // Missing items
        status: 'pending',
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 if product not found', async () => {
      const orderData = {
        items: [
          {
            productId: 'non-existent-id',
            quantity: 1,
          },
        ],
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
          street: 'Av. Paulista',
          streetNumber: '1000',
          zipcode: '01310000',
        },
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should process payment successfully when creating order', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Payment Test Product',
          price: 50.00,
          quantity: 10,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      const orderData = {
        items: [
          {
            productId: product.id,
            quantity: 1,
          },
        ],
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
          street: 'Av. Paulista',
          streetNumber: '1000',
          zipcode: '01310000',
        },
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentStatus).toBe('paid');
      expect(response.body.data.paymentTransactionId).toBeDefined();
      expect(response.body.data.paymentMethod).toBe('credit_card');
      
      // Verificar que createCreditCardTransaction foi chamado
      expect(createCreditCardTransaction).toHaveBeenCalled();
      
      // Rastrear order e items criados
      if (response.body.data?.id) {
        testDataTracker.add('order', response.body.data.id);
      }
      if (response.body.data?.items) {
        response.body.data.items.forEach((item: any) => {
          if (item.id) testDataTracker.add('orderItem', item.id);
        });
      }
    });

    it('should revert stock when payment fails during order creation', async () => {
      const initialQuantity = 20;
      const product = await prisma.product.create({
        data: {
          name: 'Stock Revert Test Product',
          price: 30.00,
          quantity: initialQuantity,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      // Mock para simular falha no pagamento
      createCreditCardTransaction.mockRejectedValueOnce(new Error('Transaction refused'));

      const orderData = {
        items: [
          {
            productId: product.id,
            quantity: 5,
          },
        ],
        cardData: {
          cardNumber: '4000000000000002', // Cartão que será recusado
          cardHolderName: 'Test User',
          cardExpirationDate: '1225',
          cardCvv: '123',
        },
        billingAddress: {
          country: 'br',
          state: 'SP',
          city: 'São Paulo',
          street: 'Av. Paulista',
          streetNumber: '1000',
          zipcode: '01310000',
        },
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .set('Authorization', `Bearer ${authToken}`);

      // Pode retornar 400 (validação) ou 500 (erro interno), ambos indicam falha
      expect([400, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);

      // Verificar que o estoque foi revertido (não deve ter diminuído)
      const updatedProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(updatedProduct?.quantity).toBe(initialQuantity);
    });

    it('should handle authorized transaction status', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Authorized Payment Product',
          price: 75.00,
          quantity: 15,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      // Mock para retornar status 'authorized'
      createCreditCardTransaction.mockResolvedValueOnce({
        id: 'trans_authorized',
        status: 'authorized',
        authorization_code: 'AUTH456',
      });

      const orderData = {
        items: [
          {
            productId: product.id,
            quantity: 1,
          },
        ],
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
          street: 'Av. Paulista',
          streetNumber: '1000',
          zipcode: '01310000',
        },
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(201);
      expect(response.body.data.paymentStatus).toBe('paid'); // 'authorized' também é considerado 'paid'
      expect(response.body.data.paymentTransactionId).toBe('trans_authorized');
      
      // Rastrear order e items
      if (response.body.data?.id) {
        testDataTracker.add('order', response.body.data.id);
      }
      if (response.body.data?.items) {
        response.body.data.items.forEach((item: any) => {
          if (item.id) testDataTracker.add('orderItem', item.id);
        });
      }
    });

    it('should handle refused transaction status and revert stock', async () => {
      const initialQuantity = 25;
      const product = await prisma.product.create({
        data: {
          name: 'Refused Payment Product',
          price: 40.00,
          quantity: initialQuantity,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      // Mock para retornar status 'refused'
      createCreditCardTransaction.mockResolvedValueOnce({
        id: 'trans_refused',
        status: 'refused',
      });

      const orderData = {
        items: [
          {
            productId: product.id,
            quantity: 3,
          },
        ],
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
          street: 'Av. Paulista',
          streetNumber: '1000',
          zipcode: '01310000',
        },
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .set('Authorization', `Bearer ${authToken}`);

      // Quando status é refused, lança erro e reverte estoque
      expect([400, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
      
      // Verificar que o estoque foi revertido
      const updatedProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(updatedProduct?.quantity).toBe(initialQuantity);
    });

    it('should validate card data format', async () => {
      const orderData = {
        items: [
          {
            productId: testProduct.id,
            quantity: 1,
          },
        ],
        cardData: {
          cardNumber: '1234', // Número inválido (muito curto)
          cardHolderName: 'Test User',
          cardExpirationDate: '1225',
          cardCvv: '123',
        },
        billingAddress: {
          country: 'br',
          state: 'SP',
          city: 'São Paulo',
          street: 'Av. Paulista',
          streetNumber: '1000',
          zipcode: '01310000',
        },
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should validate billing address required fields', async () => {
      const orderData = {
        items: [
          {
            productId: testProduct.id,
            quantity: 1,
          },
        ],
        cardData: {
          cardNumber: '4111111111111111',
          cardHolderName: 'Test User',
          cardExpirationDate: '1225',
          cardCvv: '123',
        },
        billingAddress: {
          country: 'br',
          state: 'SP',
          // Missing city, street, zipcode
        },
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should save paymentTransactionId correctly', async () => {
      const transactionId = 'trans_test_12345';
      createCreditCardTransaction.mockResolvedValueOnce({
        id: transactionId,
        status: 'paid',
        authorization_code: 'AUTH789',
      });

      const product = await prisma.product.create({
        data: {
          name: 'Transaction ID Test Product',
          price: 60.00,
          quantity: 8,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      const orderData = {
        items: [
          {
            productId: product.id,
            quantity: 1,
          },
        ],
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
          street: 'Av. Paulista',
          streetNumber: '1000',
          zipcode: '01310000',
        },
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(201);
      expect(response.body.data.paymentTransactionId).toBe(transactionId);
      
      // Verificar no banco também
      const order = await prisma.order.findUnique({
        where: { id: response.body.data.id },
      });
      expect(order?.paymentTransactionId).toBe(transactionId);
      
      // Rastrear
      testDataTracker.add('order', response.body.data.id);
      if (response.body.data?.items) {
        response.body.data.items.forEach((item: any) => {
          if (item.id) testDataTracker.add('orderItem', item.id);
        });
      }
    });
  });

  describe('GET /api/orders', () => {
    it('should list orders for authenticated user', async () => {
      // Criar uma ordem
      const product = await prisma.product.create({
        data: {
          name: 'Order List Product',
          price: 10.99,
          quantity: 10,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      const { Decimal } = require('@prisma/client/runtime/library');
      // Ensure product has price (test products should always have price)
      if (!product.price) {
        throw new Error('Test product must have a price');
      }
      const unitPrice = new Decimal(product.price.toString());
      const total = unitPrice.times(1);

      const order = await prisma.order.create({
        data: {
          userId: testUser!.id,
          subtotal: total,
          total: total,
          items: {
            create: [
              {
                productId: product.id,
                quantity: 1,
                unitPrice: unitPrice,
                discount: new Decimal(0),
                total: total,
              },
            ],
          },
          status: 'pending',
        },
        include: { items: true },
      });
      testDataTracker.add('order', order.id);
      order.items.forEach(item => testDataTracker.add('orderItem', item.id));

      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toBeDefined();
    });

    it('should filter orders by status', async () => {
      const response = await request(app)
        .get('/api/orders')
        .query({ status: 'pending' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should get order by id', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Single Order Product',
          price: 10.99,
          quantity: 10,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      const { Decimal } = require('@prisma/client/runtime/library');
      // Ensure product has price (test products should always have price)
      if (!product.price) {
        throw new Error('Test product must have a price');
      }
      const unitPrice = new Decimal(product.price.toString());
      const total = unitPrice.times(1);

      const order = await prisma.order.create({
        data: {
          userId: testUser!.id,
          subtotal: total,
          total: total,
          items: {
            create: [
              {
                productId: product.id,
                quantity: 1,
                unitPrice: unitPrice,
                discount: new Decimal(0),
                total: total,
              },
            ],
          },
          status: 'pending',
        },
        include: { items: true },
      });
      testDataTracker.add('order', order.id);
      order.items.forEach(item => testDataTracker.add('orderItem', item.id));

      const response = await request(app)
        .get(`/api/orders/${order.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(order.id);
    });

    it('should return 404 if order not found', async () => {
      const response = await request(app)
        .get('/api/orders/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/orders/:id', () => {
    it('should update order', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Update Order Product',
          price: 10.99,
          quantity: 10,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      const { Decimal } = require('@prisma/client/runtime/library');
      // Ensure product has price (test products should always have price)
      if (!product.price) {
        throw new Error('Test product must have a price');
      }
      const unitPrice = new Decimal(product.price.toString());
      const total = unitPrice.times(1);

      const order = await prisma.order.create({
        data: {
          userId: testUser!.id,
          subtotal: total,
          total: total,
          items: {
            create: [
              {
                productId: product.id,
                quantity: 1,
                unitPrice: unitPrice,
                discount: new Decimal(0),
                total: total,
              },
            ],
          },
          status: 'pending',
        },
        include: { items: true },
      });
      testDataTracker.add('order', order.id);
      order.items.forEach(item => testDataTracker.add('orderItem', item.id));

      const updateData = {
        status: 'processing',
        shippingAddress: '123 Test Street',
      };

      const response = await request(app)
        .put(`/api/orders/${order.id}`)
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(updateData.status);
    });
  });

  describe('POST /api/orders/:id/cancel', () => {
    it('should cancel order and restore stock', async () => {
      const initialQuantity = 50;
      const orderQuantity = 5;

      const product = await prisma.product.create({
        data: {
          name: 'Cancel Order Product',
          price: 10.99,
          quantity: initialQuantity - orderQuantity,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      const { Decimal } = require('@prisma/client/runtime/library');
      // Ensure product has price (test products should always have price)
      if (!product.price) {
        throw new Error('Test product must have a price');
      }
      const unitPrice = new Decimal(product.price.toString());
      const itemTotal = unitPrice.times(orderQuantity);

      const order = await prisma.order.create({
        data: {
          userId: testUser!.id,
          subtotal: itemTotal,
          total: itemTotal,
          items: {
            create: [
              {
                productId: product.id,
                quantity: orderQuantity,
                unitPrice: unitPrice,
                discount: new Decimal(0),
                total: itemTotal,
              },
            ],
          },
          status: 'pending',
        },
        include: { items: true },
      });
      testDataTracker.add('order', order.id);
      order.items.forEach(item => testDataTracker.add('orderItem', item.id));

      const response = await request(app)
        .post(`/api/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');

      // Verificar que o estoque foi restaurado
      const updatedProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(updatedProduct?.quantity).toBe(initialQuantity);
    });
  });

  describe('DELETE /api/orders/:id', () => {
    it('should soft delete order', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Delete Order Product',
          price: 10.99,
          quantity: 10,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      const { Decimal } = require('@prisma/client/runtime/library');
      // Ensure product has price (test products should always have price)
      if (!product.price) {
        throw new Error('Test product must have a price');
      }
      const unitPrice = new Decimal(product.price.toString());
      const total = unitPrice.times(1);

      const order = await prisma.order.create({
        data: {
          userId: testUser!.id,
          subtotal: total,
          total: total,
          items: {
            create: [
              {
                productId: product.id,
                quantity: 1,
                unitPrice: unitPrice,
                discount: new Decimal(0),
                total: total,
              },
            ],
          },
          status: 'pending',
        },
        include: { items: true },
      });
      testDataTracker.add('order', order.id);
      order.items.forEach(item => testDataTracker.add('orderItem', item.id));

      const response = await request(app)
        .delete(`/api/orders/${order.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verificar soft delete
      const deletedOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(deletedOrder?.deletedAt).toBeTruthy();
    });
  });
});
