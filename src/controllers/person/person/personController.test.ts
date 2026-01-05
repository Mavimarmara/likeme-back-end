import request from 'supertest';
import app from '@/server';
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

  const user = await prisma.user.create({
    data: {
      personId: person.id,
      username: `test${Date.now()}@example.com`,
      password: 'hashedpassword',
      isActive: true,
    },
  });
  testDataTracker.add('user', user.id);

  const jwt = require('jsonwebtoken');
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
};

describe('Person Endpoints', () => {
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    authToken = await createTestToken();

    // Buscar o usuário do token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'test-secret') as { userId: string };
    testUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { person: true },
    });
  });

  describe('POST /api/persons', () => {
    it('should create or update person for authenticated user', async () => {
      const personData = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const response = await request(app)
        .post('/api/persons')
        .send(personData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe(personData.firstName);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/persons')
        .send({})
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/persons', () => {
    it('should list all persons', async () => {
      const response = await request(app)
        .get('/api/persons')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/persons/:id', () => {
    it('should get person by id', async () => {
      const response = await request(app)
        .get(`/api/persons/${testUser!.personId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testUser!.personId);
    });

    it('should return 404 if person not found', async () => {
      const response = await request(app)
        .get('/api/persons/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/persons/:id', () => {
    it('should update person', async () => {
      const updateData = {
        firstName: 'Updated First',
        lastName: 'Updated Last',
      };

      const response = await request(app)
        .put(`/api/persons/${testUser!.personId}`)
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe(updateData.firstName);
    });
  });

  describe('DELETE /api/persons/:id', () => {
    it('should soft delete person', async () => {
      // Criar uma nova person para deletar
      const newPerson = await prisma.person.create({
        data: {
          firstName: 'Delete',
          lastName: 'Person',
        },
      });
      testDataTracker.add('person', newPerson.id);

      const response = await request(app)
        .delete(`/api/persons/${newPerson.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verificar soft delete
      const deletedPerson = await prisma.person.findUnique({
        where: { id: newPerson.id },
      });
      expect(deletedPerson?.deletedAt).toBeTruthy();
    });
  });
});

describe('PersonContact Endpoints', () => {
  let authToken: string;
  let testPerson: any;

  beforeAll(async () => {
    authToken = await createTestToken();

    // Buscar person do usuário autenticado
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'test-secret') as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { person: true },
    });
    testPerson = user!.person;
  });

  describe('POST /api/person-contacts', () => {
    it('should create a new contact', async () => {
      const contactData = {
        personId: testPerson.id,
        type: 'email',
        value: `test${Date.now()}@example.com`,
      };

      const response = await request(app)
        .post('/api/person-contacts')
        .send(contactData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe(contactData.type);
      expect(response.body.data.value).toBe(contactData.value);
      if (response.body.data?.id) {
        testDataTracker.add('personContact', response.body.data.id);
      }
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/person-contacts')
        .send({})
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate that type field only accepts valid values (email, phone, whatsapp, other)', async () => {
      const invalidTypes = ['cpf', 'cnpj', 'invalid', 'address', 'document'];
      
      for (const invalidType of invalidTypes) {
        const contactData = {
          personId: testPerson.id,
          type: invalidType,
          value: 'test-value',
        };

        const response = await request(app)
          .post('/api/person-contacts')
          .send(contactData)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    it('should accept valid contact types (email, phone, whatsapp, other)', async () => {
      const validTypes = ['email', 'phone', 'whatsapp', 'other'];
      
      for (const validType of validTypes) {
        const contactData = {
          personId: testPerson.id,
          type: validType,
          value: validType === 'email' ? `test${Date.now()}@example.com` : '+5511999999999',
        };

        const response = await request(app)
          .post('/api/person-contacts')
          .send(contactData)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.type).toBe(validType);
        
        if (response.body.data?.id) {
          testDataTracker.add('personContact', response.body.data.id);
        }
      }
    });
  });

  describe('GET /api/person-contacts', () => {
    it('should list all contacts', async () => {
      const response = await request(app)
        .get('/api/person-contacts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/person-contacts/:id', () => {
    it('should get contact by id', async () => {
      const contact = await prisma.personContact.create({
        data: {
          personId: testPerson.id,
          type: 'phone',
          value: '+5511999999999',
        },
      });
      testDataTracker.add('personContact', contact.id);

      const response = await request(app)
        .get(`/api/person-contacts/${contact.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(contact.id);
    });
  });

  describe('PUT /api/person-contacts/:id', () => {
    it('should update contact', async () => {
      const contact = await prisma.personContact.create({
        data: {
          personId: testPerson.id,
          type: 'phone',
          value: '+5511888888888',
        },
      });
      testDataTracker.add('personContact', contact.id);

      const updateData = {
        value: '+5511777777777',
      };

      const response = await request(app)
        .put(`/api/person-contacts/${contact.id}`)
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.value).toBe(updateData.value);
    });
  });

  describe('DELETE /api/person-contacts/:id', () => {
    it('should soft delete contact', async () => {
      const contact = await prisma.personContact.create({
        data: {
          personId: testPerson.id,
          type: 'phone',
          value: '+5511666666666',
        },
      });
      testDataTracker.add('personContact', contact.id);

      const response = await request(app)
        .delete(`/api/person-contacts/${contact.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verificar soft delete
      const deletedContact = await prisma.personContact.findUnique({
        where: { id: contact.id },
      });
      expect(deletedContact?.deletedAt).toBeTruthy();
    });
  });
});
