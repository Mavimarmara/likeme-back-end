import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import prisma from '@/config/database';
import { AuthenticatedRequest } from '@/types';
import { config } from '@/config';
import * as auth0Utils from '@/utils/auth0';

// Mock das dependências
jest.mock('@/config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    personContact: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/utils/auth0', () => ({
  verifyAuth0Token: jest.fn(),
  extractUserInfoFromToken: jest.fn(),
}));

jest.mock('@/config', () => ({
  config: {
    jwtSecret: 'test-secret-key',
  },
}));

describe('Authentication Middleware', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;
  let next: jest.MockedFunction<NextFunction>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    // Setup mocks
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    req = {
      headers: {},
    };

    res = {
      status: statusMock,
      json: jsonMock,
    };

    next = jest.fn();

    // Limpar mocks
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    describe('❌ Casos de Falha', () => {
      it('should return 401 if no token provided', async () => {
        req.headers = {}; // Sem Authorization header

        await authenticateToken(req as AuthenticatedRequest, res as Response, next);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          success: false,
          message: 'Token de acesso necessário',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should return 401 if Authorization header is malformed', async () => {
        req.headers = { authorization: 'InvalidFormat' }; // Sem "Bearer "

        await authenticateToken(req as AuthenticatedRequest, res as Response, next);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          success: false,
          message: 'Token de acesso necessário',
        });
      });

      it('should return 401 if token is invalid (backend JWT)', async () => {
        req.headers = { authorization: 'Bearer invalid-token' };

        // Mock verifyAuth0Token também falha
        (auth0Utils.verifyAuth0Token as jest.Mock).mockRejectedValue(new Error('Invalid token'));

        await authenticateToken(req as AuthenticatedRequest, res as Response, next);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          success: false,
          message: 'Token inválido',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should return 401 if token is expired', async () => {
        const expiredToken = jwt.sign(
          { userId: 'user123' },
          config.jwtSecret,
          { expiresIn: '-1h' } // Token expirado há 1 hora
        );

        req.headers = { authorization: `Bearer ${expiredToken}` };

        // Mock verifyAuth0Token também falha
        (auth0Utils.verifyAuth0Token as jest.Mock).mockRejectedValue(new Error('Token expired'));

        await authenticateToken(req as AuthenticatedRequest, res as Response, next);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          success: false,
          message: 'Token inválido',
        });
      });

      it('should return 401 if user not found in database', async () => {
        const validToken = jwt.sign({ userId: 'nonexistent-user' }, config.jwtSecret);
        req.headers = { authorization: `Bearer ${validToken}` };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

        await authenticateToken(req as AuthenticatedRequest, res as Response, next);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          success: false,
          message: 'Usuário não encontrado ou inativo',
        });
      });

      it('should return 401 if user is inactive', async () => {
        const validToken = jwt.sign({ userId: 'user123' }, config.jwtSecret);
        req.headers = { authorization: `Bearer ${validToken}` };

        const inactiveUser = {
          id: 'user123',
          isActive: false,
          deletedAt: null,
          personId: 'person123',
          username: 'test@example.com',
        };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(inactiveUser);

        await authenticateToken(req as AuthenticatedRequest, res as Response, next);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          success: false,
          message: 'Usuário não encontrado ou inativo',
        });
      });

      it('should return 401 if user is deleted (soft delete)', async () => {
        const validToken = jwt.sign({ userId: 'user123' }, config.jwtSecret);
        req.headers = { authorization: `Bearer ${validToken}` };

        const deletedUser = {
          id: 'user123',
          isActive: true,
          deletedAt: new Date(),
          personId: 'person123',
          username: 'test@example.com',
        };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(deletedUser);

        await authenticateToken(req as AuthenticatedRequest, res as Response, next);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          success: false,
          message: 'Usuário deletado',
        });
      });
    });

    describe('✅ Casos de Sucesso - Backend JWT', () => {
      it('should authenticate with valid backend JWT token', async () => {
        const validToken = jwt.sign({ userId: 'user123' }, config.jwtSecret);
        req.headers = { authorization: `Bearer ${validToken}` };

        const mockUser = {
          id: 'user123',
          personId: 'person123',
          username: 'test@example.com',
          password: 'hashed',
          avatar: null,
          isActive: true,
          socialPlusUserId: 'sp123',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

        await authenticateToken(req as AuthenticatedRequest, res as Response, next);

        expect(next).toHaveBeenCalled();
        expect((req as AuthenticatedRequest).user).toEqual(mockUser);
        expect(statusMock).not.toHaveBeenCalledWith(401);
      });

      it('should attach user to request object', async () => {
        const validToken = jwt.sign({ userId: 'user456' }, config.jwtSecret);
        req.headers = { authorization: `Bearer ${validToken}` };

        const mockUser = {
          id: 'user456',
          personId: 'person456',
          username: 'another@example.com',
          isActive: true,
          deletedAt: null,
        };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

        await authenticateToken(req as AuthenticatedRequest, res as Response, next);

        expect((req as AuthenticatedRequest).user).toBeDefined();
        expect((req as AuthenticatedRequest).user?.id).toBe('user456');
      });
    });

    describe('✅ Casos de Sucesso - Auth0 Token', () => {
      it('should authenticate with valid Auth0 token when backend JWT fails', async () => {
        const auth0Token = 'valid-auth0-token';
        req.headers = { authorization: `Bearer ${auth0Token}` };

        // Backend JWT verification falha (token não é formato backend)
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

        // Auth0 verification sucesso
        const auth0Decoded = { sub: 'auth0|123', email: 'user@example.com' };
        (auth0Utils.verifyAuth0Token as jest.Mock).mockResolvedValue(auth0Decoded);
        (auth0Utils.extractUserInfoFromToken as jest.Mock).mockReturnValue({
          email: 'user@example.com',
          name: 'Test User',
        });

        const mockUser = {
          id: 'user789',
          personId: 'person789',
          username: 'user@example.com',
          isActive: true,
          deletedAt: null,
        };

        const mockContact = {
          person: {
            user: mockUser,
          },
        };

        (prisma.personContact.findFirst as jest.Mock).mockResolvedValue(mockContact);

        await authenticateToken(req as AuthenticatedRequest, res as Response, next);

        expect(next).toHaveBeenCalled();
        expect((req as AuthenticatedRequest).user).toEqual(mockUser);
        expect(auth0Utils.verifyAuth0Token).toHaveBeenCalledWith(auth0Token);
      });

      it('should return 401 if Auth0 token does not have email', async () => {
        const auth0Token = 'auth0-token-without-email';
        req.headers = { authorization: `Bearer ${auth0Token}` };

        (auth0Utils.verifyAuth0Token as jest.Mock).mockResolvedValue({ sub: 'auth0|123' });
        (auth0Utils.extractUserInfoFromToken as jest.Mock).mockReturnValue({ email: null });

        await authenticateToken(req as AuthenticatedRequest, res as Response, next);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          success: false,
          message: 'Email não encontrado no token do Auth0',
        });
      });

      it('should return 401 if user not registered (Auth0 token valid but no local account)', async () => {
        const auth0Token = 'valid-auth0-token';
        req.headers = { authorization: `Bearer ${auth0Token}` };

        (auth0Utils.verifyAuth0Token as jest.Mock).mockResolvedValue({
          sub: 'auth0|123',
          email: 'newuser@example.com',
        });
        (auth0Utils.extractUserInfoFromToken as jest.Mock).mockReturnValue({
          email: 'newuser@example.com',
        });

        (prisma.personContact.findFirst as jest.Mock).mockResolvedValue(null);

        await authenticateToken(req as AuthenticatedRequest, res as Response, next);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          success: false,
          message: 'Usuário não encontrado. Faça o registro primeiro.',
        });
      });
    });

    describe('🔒 Edge Cases - Segurança', () => {
      it('should not expose sensitive error details', async () => {
        req.headers = { authorization: 'Bearer malicious-token' };

        (auth0Utils.verifyAuth0Token as jest.Mock).mockRejectedValue(
          new Error('Sensitive database error with connection string')
        );

        await authenticateToken(req as AuthenticatedRequest, res as Response, next);

        expect(jsonMock).toHaveBeenCalledWith({
          success: false,
          message: 'Token inválido', // Mensagem genérica, não expõe detalhes
        });
      });

      it('should handle database connection errors gracefully', async () => {
        const validToken = jwt.sign({ userId: 'user123' }, config.jwtSecret);
        req.headers = { authorization: `Bearer ${validToken}` };

        (prisma.user.findUnique as jest.Mock).mockRejectedValue(
          new Error('Database connection failed')
        );
        
        // Mock Auth0 verification to also fail
        (verifyAuth0Token as jest.Mock).mockRejectedValue(new Error('Invalid token'));

        await authenticateToken(req as AuthenticatedRequest, res as Response, next);

        // Quando há erro de database, o middleware tenta Auth0 e retorna 401
        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          success: false,
          message: 'Token inválido',
        });
      });
    });
  });

  describe('requireAuth', () => {
    it('should return 401 if user is not attached to request', () => {
      req.user = undefined;

      requireAuth(req as AuthenticatedRequest, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Autenticação necessária',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() if user is attached to request', () => {
      (req as AuthenticatedRequest).user = {
        id: 'user123',
        personId: 'person123',
        username: 'test@example.com',
        password: 'hashed',
        avatar: null,
        isActive: true,
        socialPlusUserId: 'sp123',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      requireAuth(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });
});

