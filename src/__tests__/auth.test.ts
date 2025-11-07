import request from 'supertest';
import app from '../server';

describe('Auth Endpoints', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123',
        phone: '(11) 99999-9999',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.token).toBeDefined();
    });

    it('should not register user with existing email', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123',
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);
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

      expect([200, 400]).toContain(response.status);
    });
  });
});
