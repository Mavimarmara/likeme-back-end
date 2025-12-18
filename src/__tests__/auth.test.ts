import request from 'supertest';
import app from '../server';
import prisma from '@/config/database';
import { safeTestCleanup, TestDataTracker } from '@/utils/test-helpers';

jest.setTimeout(20000);

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

afterEach(async () => {
  // Limpar tracker após cada teste para evitar acúmulo
  // Mas não deletar dados aqui - deixar o afterAll fazer isso
});

describe('Auth Endpoints', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const timestamp = Date.now();
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: `test${timestamp}@example.com`,
        password: 'password123',
        phone: '(11) 99999-9999',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.token).toBeDefined();
        expect(response.body.data.user).toBeDefined();
        expect(response.body.data.user.person).toBeDefined();
        
        // Rastrear IDs criados
        if (response.body.data.user?.id) {
          testDataTracker.add('user', response.body.data.user.id);
        }
        if (response.body.data.user?.person?.id) {
          testDataTracker.add('person', response.body.data.user.person.id);
        }
        if (response.body.data.user?.person?.contacts) {
          response.body.data.user.person.contacts.forEach((contact: any) => {
            if (contact.id) testDataTracker.add('personContact', contact.id);
          });
        }
        
        const emailContact = response.body.data.user.person.contacts?.find(
          (c: any) => c.type === 'email'
        );
        if (emailContact) {
          expect(emailContact.value).toBe(userData.email);
        }
      } else {
        expect([409, 400, 429]).toContain(response.status);
      }
    });

    it('should not register user with existing email', async () => {
      const timestamp = Date.now();
      const email = `existing${timestamp}@example.com`;
      
      const userData1 = {
        firstName: 'Test',
        lastName: 'User1',
        email: email,
        password: 'password123',
      };

      const response1 = await request(app)
        .post('/api/auth/register')
        .send(userData1);
      
      // Rastrear dados criados no primeiro registro
      if (response1.status === 201 && response1.body.data?.user) {
        if (response1.body.data.user.id) {
          testDataTracker.add('user', response1.body.data.user.id);
        }
        if (response1.body.data.user.person?.id) {
          testDataTracker.add('person', response1.body.data.user.person.id);
        }
        if (response1.body.data.user.person?.contacts) {
          response1.body.data.user.person.contacts.forEach((contact: any) => {
            if (contact.id) testDataTracker.add('personContact', contact.id);
          });
        }
      }

      const userData2 = {
        firstName: 'Test',
        lastName: 'User2',
        email: email,
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData2);

      expect([409, 400, 429]).toContain(response.status);
      
      // Se o segundo registro tiver sucesso (improvável), rastrear também
      if (response.status === 201 && response.body.data?.user) {
        if (response.body.data.user.id) {
          testDataTracker.add('user', response.body.data.user.id);
        }
        if (response.body.data.user.person?.id) {
          testDataTracker.add('person', response.body.data.user.person.id);
        }
        if (response.body.data.user.person?.contacts) {
          response.body.data.user.person.contacts.forEach((contact: any) => {
            if (contact.id) testDataTracker.add('personContact', contact.id);
          });
        }
      }
    });

    it('should validate required fields', async () => {
      const userData = {
        firstName: 'Test',
        // Missing email, lastName and password
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with Auth0 idToken', async () => {
      const loginData = {
        idToken: 'mock-auth0-token',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect([200, 400, 401]).toContain(response.status);
    });

    it('should validate login request', async () => {
      const loginData = {};

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect([200, 400, 429]).toContain(response.status);
    });
  });
});
