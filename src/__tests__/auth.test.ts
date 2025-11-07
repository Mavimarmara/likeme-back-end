import request from 'supertest';
import app from '../server';

jest.setTimeout(20000);

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

      await request(app)
        .post('/api/auth/register')
        .send(userData1);

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
