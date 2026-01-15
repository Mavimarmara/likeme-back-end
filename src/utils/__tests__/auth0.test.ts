import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { verifyAuth0Token, extractUserInfoFromToken, Auth0UserInfo } from '@/utils/auth0';
import { config } from '@/config';

// Mock das dependências
jest.mock('jwks-rsa');
jest.mock('@/config', () => ({
  config: {
    auth0: {
      domain: 'test-domain.auth0.com',
      issuer: 'https://test-domain.auth0.com/',
      clientId: 'test-client-id',
    },
    jwtSecret: 'test-secret',
    jwtExpiresIn: '1h',
  },
}));

// Mock do jwt.verify para controlar o comportamento
const originalJwtVerify = jwt.verify;
jest.spyOn(jwt, 'verify');

describe('Auth0 Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractUserInfoFromToken', () => {
    it('should extract all user info from valid token payload', () => {
      const mockPayload: jwt.JwtPayload = {
        sub: 'auth0|123456',
        email: 'test@example.com',
        email_verified: true,
        name: 'Test User',
        nickname: 'testuser',
        picture: 'https://example.com/avatar.jpg',
        given_name: 'Test',
        family_name: 'User',
      };

      const result = extractUserInfoFromToken(mockPayload);

      expect(result).toEqual({
        sub: 'auth0|123456',
        email: 'test@example.com',
        email_verified: true,
        name: 'Test User',
        nickname: 'testuser',
        picture: 'https://example.com/avatar.jpg',
        given_name: 'Test',
        family_name: 'User',
      });
    });

    it('should handle partial user info', () => {
      const mockPayload: jwt.JwtPayload = {
        sub: 'auth0|789',
        email: 'partial@example.com',
      };

      const result = extractUserInfoFromToken(mockPayload);

      expect(result.sub).toBe('auth0|789');
      expect(result.email).toBe('partial@example.com');
      expect(result.email_verified).toBeUndefined();
      expect(result.name).toBeUndefined();
    });

    it('should handle missing sub (edge case)', () => {
      const mockPayload: jwt.JwtPayload = {
        email: 'nosub@example.com',
      };

      const result = extractUserInfoFromToken(mockPayload);

      expect(result.sub).toBe(''); // Default to empty string
      expect(result.email).toBe('nosub@example.com');
    });

    it('should handle empty payload', () => {
      const mockPayload: jwt.JwtPayload = {};

      const result = extractUserInfoFromToken(mockPayload);

      expect(result.sub).toBe('');
      expect(result.email).toBeUndefined();
      expect(result.name).toBeUndefined();
    });

    it('should type cast values correctly', () => {
      const mockPayload: jwt.JwtPayload = {
        sub: 'auth0|type-test',
        email: 'typetest@example.com',
        email_verified: true,
      };

      const result = extractUserInfoFromToken(mockPayload);

      expect(typeof result.sub).toBe('string');
      expect(typeof result.email).toBe('string');
      expect(typeof result.email_verified).toBe('boolean');
    });

    describe('Social Login Providers', () => {
      it('should extract info from Google OAuth token', () => {
        const mockPayload: jwt.JwtPayload = {
          sub: 'google-oauth2|123456789',
          email: 'user@gmail.com',
          email_verified: true,
          name: 'Google User',
          picture: 'https://lh3.googleusercontent.com/...',
          given_name: 'Google',
          family_name: 'User',
        };

        const result = extractUserInfoFromToken(mockPayload);

        expect(result.sub).toContain('google-oauth2');
        expect(result.email).toBe('user@gmail.com');
      });

      it('should extract info from Facebook OAuth token', () => {
        const mockPayload: jwt.JwtPayload = {
          sub: 'facebook|987654321',
          email: 'user@facebook.com',
          name: 'Facebook User',
          picture: 'https://graph.facebook.com/...',
        };

        const result = extractUserInfoFromToken(mockPayload);

        expect(result.sub).toContain('facebook');
        expect(result.email).toBe('user@facebook.com');
      });
    });

    describe('Edge Cases', () => {
      it('should handle very long names', () => {
        const longName = 'A'.repeat(1000);
        const mockPayload: jwt.JwtPayload = {
          sub: 'auth0|long',
          name: longName,
        };

        const result = extractUserInfoFromToken(mockPayload);

        expect(result.name).toBe(longName);
        expect(result.name?.length).toBe(1000);
      });

      it('should handle special characters in name', () => {
        const mockPayload: jwt.JwtPayload = {
          sub: 'auth0|special',
          name: 'José María Ñoño',
          email: 'josé@example.com',
        };

        const result = extractUserInfoFromToken(mockPayload);

        expect(result.name).toBe('José María Ñoño');
        expect(result.email).toBe('josé@example.com');
      });

      it('should handle null values gracefully', () => {
        const mockPayload: jwt.JwtPayload = {
          sub: 'auth0|null-test',
          email: null as any,
          name: null as any,
        };

        const result = extractUserInfoFromToken(mockPayload);

        expect(result.sub).toBe('auth0|null-test');
        // Valores null/undefined devem ser mantidos como estão
        expect(result.email).toBeNull();
      });
    });
  });

  describe('verifyAuth0Token', () => {
    describe('❌ Configuration Errors', () => {
      it('should reject if AUTH0_DOMAIN is not configured', async () => {
        // Temporariamente sobrescrever config
        const originalDomain = config.auth0.domain;
        (config.auth0 as any).domain = '';

        await expect(verifyAuth0Token('some-token')).rejects.toThrow(
          'AUTH0_DOMAIN não configurado'
        );

        // Restaurar
        (config.auth0 as any).domain = originalDomain;
      });
    });

    describe('Token Validation', () => {
      beforeEach(() => {
        // Mock jwksClient
        const mockClient = {
          getSigningKey: jest.fn((kid, callback) => {
            callback(null, {
              getPublicKey: () => 'mock-public-key',
            });
          }),
        };
        (jwksClient as jest.Mock).mockReturnValue(mockClient);
      });

      it('should verify valid token structure', async () => {
        const mockDecoded = {
          sub: 'auth0|valid',
          email: 'valid@example.com',
          iss: config.auth0.issuer,
          aud: config.auth0.clientId,
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
        };

        // Mock jwt.verify para retornar sucesso
        (jwt.verify as jest.Mock).mockImplementation(
          (token, key, options, callback) => {
            if (typeof callback === 'function') {
              callback(null, mockDecoded);
            }
            return mockDecoded;
          }
        );

        const result = await verifyAuth0Token('valid-token');

        expect(result).toEqual(mockDecoded);
      });

      it('should reject invalid token with error message', async () => {
        // Mock jwt.verify para retornar erro
        (jwt.verify as jest.Mock).mockImplementation(
          (token, key, options, callback) => {
            if (typeof callback === 'function') {
              callback(new Error('invalid signature'), undefined);
            }
          }
        );

        await expect(verifyAuth0Token('invalid-token')).rejects.toThrow();
      });

      it('should reject token with wrong issuer', async () => {
        const mockDecoded = {
          sub: 'auth0|test',
          iss: 'https://wrong-issuer.com/',
        };

        (jwt.verify as jest.Mock).mockImplementation(
          (token, key, options, callback) => {
            if (typeof callback === 'function') {
              callback(new Error('invalid issuer'), mockDecoded);
            }
          }
        );

        await expect(verifyAuth0Token('token-wrong-issuer')).rejects.toThrow();
      });

      it('should reject string decoded token (invalid format)', async () => {
        (jwt.verify as jest.Mock).mockImplementation(
          (token, key, options, callback) => {
            if (typeof callback === 'function') {
              // Retornar string em vez de objeto (caso edge)
              callback(null, 'invalid-string-token');
            }
          }
        );

        await expect(verifyAuth0Token('string-token')).rejects.toThrow('Token inválido');
      });
    });

    describe('JWKS Client Errors', () => {
      it('should handle signing key retrieval error', async () => {
        // Mock jwksClient com erro
        const mockClient = {
          getSigningKey: jest.fn((kid, callback) => {
            callback(new Error('Failed to retrieve signing key'), null);
          }),
        };
        (jwksClient as jest.Mock).mockReturnValue(mockClient);

        (jwt.verify as jest.Mock).mockImplementation(
          (token, getKey, options, callback) => {
            if (typeof getKey === 'function') {
              // Simular chamada ao getKey
              getKey({} as jwt.JwtHeader, (err, key) => {
                if (callback) callback(err as any, undefined);
              });
            }
          }
        );

        await expect(verifyAuth0Token('token-jwks-error')).rejects.toThrow();
      });
    });

    describe('Security Checks', () => {
      it('should verify RS256 algorithm is required', async () => {
        const mockClient = {
          getSigningKey: jest.fn((kid, callback) => {
            callback(null, { getPublicKey: () => 'key' });
          }),
        };
        (jwksClient as jest.Mock).mockReturnValue(mockClient);

        (jwt.verify as jest.Mock).mockImplementation(
          (token, key, options, callback) => {
            // Verificar que options inclui RS256
            expect(options).toHaveProperty('algorithms');
            expect(options.algorithms).toContain('RS256');
            
            if (callback) callback(null, { sub: 'test' });
          }
        );

        await verifyAuth0Token('token-algo-check');
      });

      it('should verify issuer is checked', async () => {
        const mockClient = {
          getSigningKey: jest.fn((kid, callback) => {
            callback(null, { getPublicKey: () => 'key' });
          }),
        };
        (jwksClient as jest.Mock).mockReturnValue(mockClient);

        (jwt.verify as jest.Mock).mockImplementation(
          (token, key, options, callback) => {
            // Verificar que issuer está sendo validado
            expect(options).toHaveProperty('issuer');
            expect(Array.isArray(options.issuer)).toBe(true);
            
            if (callback) callback(null, { sub: 'test' });
          }
        );

        await verifyAuth0Token('token-issuer-check');
      });
    });
  });
});

