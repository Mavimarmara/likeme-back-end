import request from 'supertest';
import app from '@/server';
import prisma from '@/config/database';
import { safeTestCleanup, TestDataTracker, generateTestId, createTestToken, TEST_ID_PREFIX } from '@/utils/test-helpers';

jest.setTimeout(30000);

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

describe('Product Endpoints', () => {
  let authToken: string;

  beforeAll(async () => {
    authToken = await createTestToken(prisma, testDataTracker);
  });

  describe('POST /api/products', () => {
    it('should create a new product', async () => {
      const productData = {
        name: 'Test Product',
        description: 'Test description',
        price: 99.99,
        quantity: 10,
        status: 'active',
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(productData.name);
      expect(response.body.data.price).toBe(productData.price.toString());
      if (response.body.data?.id) {
        testDataTracker.add('product', response.body.data.id);
      }
    });

    it('should validate required fields', async () => {
      const productData = {
        description: 'Missing name and price',
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 if token is missing', async () => {
      const response = await request(app)
        .post('/api/products')
        .send({ name: 'Test', price: 10 });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/products', () => {
    it('should list all products', async () => {
      // Criar alguns produtos
      const product1Id = generateTestId();
      const product2Id = generateTestId();
      await prisma.product.createMany({
        data: [
          {
            id: product1Id,
            name: `Product 1${TEST_ID_PREFIX}`,
            price: 10.99,
            quantity: 5,
            status: 'active',
          },
          {
            id: product2Id,
            name: `Product 2${TEST_ID_PREFIX}`,
            price: 20.99,
            quantity: 10,
            status: 'active',
          },
        ],
      });
      
      testDataTracker.add('product', product1Id);
      testDataTracker.add('product', product2Id);

      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter products by category', async () => {
      const productId = generateTestId();
      const product = await prisma.product.create({
        data: {
          id: productId,
          name: `Categorized Product${TEST_ID_PREFIX}`,
          price: 15.99,
          quantity: 5,
          category: 'Electronics',
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      const response = await request(app)
        .get('/api/products')
        .query({ category: 'Electronics' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should get a product by id', async () => {
      const productId = generateTestId();
      const product = await prisma.product.create({
        data: {
          id: productId,
          name: `Single Product${TEST_ID_PREFIX}`,
          price: 25.99,
          quantity: 5,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      const response = await request(app)
        .get(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(product.id);
      expect(response.body.data.name).toBe(`Single Product${TEST_ID_PREFIX}`);
    });

    it('should return 404 if product not found', async () => {
      const response = await request(app)
        .get('/api/products/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update a product', async () => {
      const productId = generateTestId();
      const product = await prisma.product.create({
        data: {
          id: productId,
          name: `Original Product${TEST_ID_PREFIX}`,
          price: 10.99,
          quantity: 5,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      const updateData = {
        name: 'Updated Product',
        price: 15.99,
      };

      const response = await request(app)
        .put(`/api/products/${product.id}`)
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
    });

    it('should return 404 if product not found', async () => {
      const response = await request(app)
        .put('/api/products/non-existent-id')
        .send({ name: 'Updated' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/products/:id/stock', () => {
    it('should add to stock', async () => {
      const productId = generateTestId();
      const product = await prisma.product.create({
        data: {
          id: productId,
          name: `Stock Product${TEST_ID_PREFIX}`,
          price: 10.99,
          quantity: 10,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      const response = await request(app)
        .patch(`/api/products/${product.id}/stock`)
        .send({ quantity: 5, operation: 'add' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Number(response.body.data.quantity)).toBe(15);
    });

    it('should subtract from stock', async () => {
      const productId = generateTestId();
      const product = await prisma.product.create({
        data: {
          id: productId,
          name: `Subtract Stock Product${TEST_ID_PREFIX}`,
          price: 10.99,
          quantity: 10,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      const response = await request(app)
        .patch(`/api/products/${product.id}/stock`)
        .send({ quantity: 3, operation: 'subtract' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Number(response.body.data.quantity)).toBe(7);
    });

    it('should set stock', async () => {
      const productId = generateTestId();
      const product = await prisma.product.create({
        data: {
          id: productId,
          name: `Set Stock Product${TEST_ID_PREFIX}`,
          price: 10.99,
          quantity: 10,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      const response = await request(app)
        .patch(`/api/products/${product.id}/stock`)
        .send({ quantity: 25, operation: 'set' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Number(response.body.data.quantity)).toBe(25);
    });

    it('should validate stock operation', async () => {
      const productId = generateTestId();
      const product = await prisma.product.create({
        data: {
          id: productId,
          name: `Validation Product${TEST_ID_PREFIX}`,
          price: 10.99,
          quantity: 10,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      const response = await request(app)
        .patch(`/api/products/${product.id}/stock`)
        .send({ quantity: 5 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should soft delete a product', async () => {
      const productId = generateTestId();
      const product = await prisma.product.create({
        data: {
          id: productId,
          name: `Delete Product${TEST_ID_PREFIX}`,
          price: 10.99,
          quantity: 5,
          status: 'active',
        },
      });
      testDataTracker.add('product', product.id);

      const response = await request(app)
        .delete(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verificar que foi soft deleted
      const deletedProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(deletedProduct?.deletedAt).toBeTruthy();
    });

    it('should return 404 if product not found', async () => {
      const response = await request(app)
        .delete('/api/products/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
