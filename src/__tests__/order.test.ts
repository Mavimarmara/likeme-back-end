import request from 'supertest';
import app from '../server';
import prisma from '@/config/database';

jest.setTimeout(30000);

beforeAll(async () => {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  NODE_ENV não está definido como "test". Os testes podem afetar o banco de dados de desenvolvimento!');
  }
});

afterAll(async () => {
  if (process.env.NODE_ENV === 'test') {
    try {
      await prisma.orderItem.deleteMany({});
      await prisma.order.deleteMany({});
      await prisma.product.deleteMany({});
      await prisma.user.deleteMany({});
      await prisma.person.deleteMany({});
    } catch (error) {
      console.error('Erro ao limpar dados de teste:', error);
    }
  }
  await prisma.$disconnect();
});

// Helper para criar um token de teste
const createTestToken = async (): Promise<string> => {
  const person = await prisma.person.create({
    data: {
      firstName: 'Test',
      lastName: 'User',
    },
  });

  const user = await prisma.user.create({
    data: {
      personId: person.id,
      username: `test${Date.now()}@example.com`,
      password: 'hashedpassword',
      isActive: true,
    },
  });

  const jwt = require('jsonwebtoken');
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
};

describe('Order Endpoints', () => {
  let authToken: string;
  let testUser: any;
  let testProduct: any;

  beforeAll(async () => {
    authToken = await createTestToken();

    // Buscar o usuário do token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'test-secret') as { userId: string };
    testUser = await prisma.user.findUnique({ where: { id: decoded.userId } });

    // Criar produto de teste
    testProduct = await prisma.product.create({
      data: {
        name: 'Test Product',
        price: 99.99,
        quantity: 100,
        status: 'active',
      },
    });
  });

  describe('POST /api/orders', () => {
    it('should create a new order', async () => {
      const orderData = {
        items: [
          {
            productId: testProduct.id,
            quantity: 2,
          },
        ],
        status: 'pending',
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toBeDefined();
      expect(response.body.data.items.length).toBe(1);
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

      const orderData = {
        items: [
          {
            productId: product.id,
            quantity: orderQuantity,
          },
        ],
      };

      await request(app)
        .post('/api/orders')
        .send(orderData)
        .set('Authorization', `Bearer ${authToken}`);

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
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
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

      const { Decimal } = require('@prisma/client/runtime/library');
      const unitPrice = new Decimal(product.price.toString());
      const total = unitPrice.times(1);

      await prisma.order.create({
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
      });

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

      const { Decimal } = require('@prisma/client/runtime/library');
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
      });

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

      const { Decimal } = require('@prisma/client/runtime/library');
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
      });

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

      const { Decimal } = require('@prisma/client/runtime/library');
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
      });

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

      const { Decimal } = require('@prisma/client/runtime/library');
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
      });

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
