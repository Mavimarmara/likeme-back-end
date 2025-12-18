import request from 'supertest';
import app from '../server';
import prisma from '@/config/database';
import { safeTestCleanup, TestDataTracker } from '@/utils/test-helpers';

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

// Helper para criar um token de teste
const createTestToken = async (): Promise<string> => {
  const person = await prisma.person.create({
    data: {
      firstName: 'Test',
      lastName: 'User',
    },
  });
  testDataTracker.add('person', person.id);

  // Usar timestamp + random para garantir unicidade
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const user = await prisma.user.create({
    data: {
      personId: person.id,
      username: `test-${uniqueId}@example.com`,
      password: 'hashedpassword',
      isActive: true,
    },
  });
  testDataTracker.add('user', user.id);

  const jwt = require('jsonwebtoken');
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
};

describe('Advertiser Endpoints', () => {
  let authToken: string;
  let testUser: any;

  // Helper para obter token válido
  const getValidToken = async (): Promise<string> => {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'test-secret') as { userId: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (user && !user.deletedAt && user.isActive) {
        return authToken;
      }
    } catch {
      // Token inválido
    }
    return await createTestToken();
  };

  beforeAll(async () => {
    authToken = await createTestToken();

    // Buscar o usuário do token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'test-secret') as { userId: string };
    testUser = await prisma.user.findUnique({ where: { id: decoded.userId } });
  });

  describe('POST /api/advertisers', () => {
    it('should create a new advertiser', async () => {
      const advertiserData = {
        name: 'Test Advertiser',
        description: 'Test description',
        contactEmail: 'advertiser@example.com',
        status: 'active',
      };

      const response = await request(app)
        .post('/api/advertisers')
        .send(advertiserData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(advertiserData.name);
      expect(response.body.data.userId).toBe(testUser!.id);
      if (response.body.data?.id) {
        testDataTracker.add('advertiser', response.body.data.id);
      }
    });

    it('should validate required fields', async () => {
      const advertiserData = {
        description: 'Missing name',
      };

      const response = await request(app)
        .post('/api/advertisers')
        .send(advertiserData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/advertisers', () => {
    it('should list all advertisers', async () => {
      // Criar alguns advertisers com diferentes usuários (userId é unique)
      const person1 = await prisma.person.create({
        data: { firstName: 'User1', lastName: 'Test' },
      });
      testDataTracker.add('person', person1.id);
      
      const uniqueId1 = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const user1 = await prisma.user.create({
        data: {
          personId: person1.id,
          username: `testuser1-${uniqueId1}@example.com`,
          password: 'hashedpassword',
          isActive: true,
        },
      });
      testDataTracker.add('user', user1.id);

      const person2 = await prisma.person.create({
        data: { firstName: 'User2', lastName: 'Test' },
      });
      testDataTracker.add('person', person2.id);
      
      const uniqueId2 = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const user2 = await prisma.user.create({
        data: {
          personId: person2.id,
          username: `testuser2-${uniqueId2}@example.com`,
          password: 'hashedpassword',
          isActive: true,
        },
      });
      testDataTracker.add('user', user2.id);

      await prisma.advertiser.createMany({
        data: [
          {
            userId: user1.id,
            name: 'Advertiser 1',
            status: 'active',
          },
          {
            userId: user2.id,
            name: 'Advertiser 2',
            status: 'active',
          },
        ],
      });
      
      // Buscar IDs dos advertisers criados
      const advertisers = await prisma.advertiser.findMany({
        where: { userId: { in: [user1.id, user2.id] } },
        select: { id: true },
      });
      advertisers.forEach(a => testDataTracker.add('advertiser', a.id));

      const response = await request(app)
        .get('/api/advertisers')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should filter advertisers by status', async () => {
      const response = await request(app)
        .get('/api/advertisers')
        .query({ status: 'active' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/advertisers/:id', () => {
    it('should get advertiser by id', async () => {
      // Verificar se já existe advertiser para este usuário
      let advertiser = await prisma.advertiser.findUnique({
        where: { userId: testUser!.id },
      });

      if (!advertiser) {
        advertiser = await prisma.advertiser.create({
          data: {
            userId: testUser!.id,
            name: 'Single Advertiser',
            status: 'active',
          },
        });
        testDataTracker.add('advertiser', advertiser.id);
      }

      const response = await request(app)
        .get(`/api/advertisers/${advertiser.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(advertiser.id);
      // Aceitar qualquer nome já que pode ser um advertiser criado anteriormente
      expect(response.body.data.name).toBeTruthy();
    });

    it('should return 404 if advertiser not found', async () => {
      const token = await getValidToken();
      const response = await request(app)
        .get('/api/advertisers/non-existent-id')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/advertisers/user/:userId', () => {
    it('should get advertiser by user id', async () => {
      // Verificar se já existe advertiser para este usuário
      let advertiser = await prisma.advertiser.findUnique({
        where: { userId: testUser!.id },
      });

      if (!advertiser) {
        advertiser = await prisma.advertiser.create({
          data: {
            userId: testUser!.id,
            name: 'User Advertiser',
            status: 'active',
          },
        });
        testDataTracker.add('advertiser', advertiser.id);
      }

      const response = await request(app)
        .get(`/api/advertisers/user/${testUser!.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(testUser!.id);
    });

    it('should return 404 if no advertiser found for user', async () => {
      const token = await getValidToken();
      
      // Criar um novo usuário sem advertiser
      const person = await prisma.person.create({
        data: { firstName: 'No', lastName: 'Advertiser' },
      });
      testDataTracker.add('person', person.id);
      
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newUser = await prisma.user.create({
        data: {
          personId: person.id,
          username: `noadvertiser-${uniqueId}@example.com`,
          password: 'hashedpassword',
          isActive: true,
        },
      });
      testDataTracker.add('user', newUser.id);

      const response = await request(app)
        .get(`/api/advertisers/user/${newUser.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/advertisers/:id', () => {
    it('should update advertiser', async () => {
      // Verificar se já existe advertiser para este usuário
      let advertiser = await prisma.advertiser.findUnique({
        where: { userId: testUser!.id },
      });

      if (!advertiser) {
        advertiser = await prisma.advertiser.create({
          data: {
            userId: testUser!.id,
            name: 'Original Advertiser',
            status: 'active',
          },
        });
        testDataTracker.add('advertiser', advertiser.id);
      }

      const updateData = {
        name: 'Updated Advertiser',
        description: 'Updated description',
      };

      const response = await request(app)
        .put(`/api/advertisers/${advertiser.id}`)
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
    });

    it('should return 404 if advertiser not found', async () => {
      const response = await request(app)
        .put('/api/advertisers/non-existent-id')
        .send({ name: 'Updated' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/advertisers/:id', () => {
    it('should soft delete advertiser', async () => {
      // Criar um novo usuário e token para este teste
      const person = await prisma.person.create({
        data: { firstName: 'Delete', lastName: 'User' },
      });
      testDataTracker.add('person', person.id);
      
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const deleteTestUser = await prisma.user.create({
        data: {
          personId: person.id,
          username: `deletetest-${uniqueId}@example.com`,
          password: 'hashedpassword',
          isActive: true,
        },
      });
      testDataTracker.add('user', deleteTestUser.id);

      const advertiser = await prisma.advertiser.create({
        data: {
          userId: deleteTestUser.id,
          name: 'Delete Advertiser',
          status: 'active',
        },
      });
      testDataTracker.add('advertiser', advertiser.id);

      // Criar token para o novo usuário
      const jwt = require('jsonwebtoken');
      const deleteToken = jwt.sign(
        { userId: deleteTestUser.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .delete(`/api/advertisers/${advertiser.id}`)
        .set('Authorization', `Bearer ${deleteToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verificar soft delete
      const deletedAdvertiser = await prisma.advertiser.findUnique({
        where: { id: advertiser.id },
      });
      expect(deletedAdvertiser?.deletedAt).toBeTruthy();
    });

    it('should return 404 if advertiser not found', async () => {
      const token = await getValidToken();
      const response = await request(app)
        .delete('/api/advertisers/non-existent-id')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
});
