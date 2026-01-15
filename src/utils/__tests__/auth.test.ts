import jwt from 'jsonwebtoken';
import { generateToken } from '@/utils/auth';
import { config } from '@/config';

jest.mock('@/config', () => ({
  config: {
    jwtSecret: 'test-secret-key-for-testing',
    jwtExpiresIn: '1h',
  },
}));

describe('Auth Utils', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const userId = 'user-123';
      const token = generateToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should include userId in token payload', () => {
      const userId = 'user-456';
      const token = generateToken(userId);

      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
      expect(decoded.userId).toBe(userId);
    });

    it('should set expiration time based on config', () => {
      const userId = 'user-789';
      const token = generateToken(userId);

      const decoded = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
      
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      
      // Token deve expirar em ~1 hora (3600 segundos)
      const expiresIn = decoded.exp! - decoded.iat!;
      expect(expiresIn).toBe(3600);
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateToken('user-1');
      const token2 = generateToken('user-2');

      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens for same user at different times', async () => {
      const userId = 'user-same';
      
      const token1 = generateToken(userId);
      
      // Delay de 1 segundo para garantir iat diferente (JWT usa segundos, não milissegundos)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const token2 = generateToken(userId);

      // Tokens devem ser diferentes porque iat (issued at) é diferente
      expect(token1).not.toBe(token2);
    });

    it('should create token that can be decoded', () => {
      const userId = 'user-decode';
      const token = generateToken(userId);

      expect(() => {
        jwt.verify(token, config.jwtSecret);
      }).not.toThrow();
    });

    it('should create token with correct structure', () => {
      const userId = 'user-structure';
      const token = generateToken(userId);

      const decoded = jwt.decode(token) as jwt.JwtPayload;
      
      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('iat'); // issued at
      expect(decoded).toHaveProperty('exp'); // expires
    });

    describe('Edge Cases', () => {
      it('should handle special characters in userId', () => {
        const userId = 'user-with-special-chars_123@domain.com';
        const token = generateToken(userId);

        const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
        expect(decoded.userId).toBe(userId);
      });

      it('should handle very long userId', () => {
        const userId = 'u'.repeat(1000);
        const token = generateToken(userId);

        const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
        expect(decoded.userId).toBe(userId);
      });

      it('should handle userId with UUID format', () => {
        const userId = '123e4567-e89b-12d3-a456-426614174000';
        const token = generateToken(userId);

        const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
        expect(decoded.userId).toBe(userId);
      });
    });

    describe('Token Validation', () => {
      it('should fail validation with wrong secret', () => {
        const token = generateToken('user-test');

        expect(() => {
          jwt.verify(token, 'wrong-secret');
        }).toThrow('invalid signature');
      });

      it('should fail validation if token is modified', () => {
        const token = generateToken('user-test');
        const modifiedToken = token.slice(0, -1) + 'X'; // Modificar último caractere

        expect(() => {
          jwt.verify(modifiedToken, config.jwtSecret);
        }).toThrow();
      });

      it('should validate token before expiration', () => {
        const token = generateToken('user-valid');
        
        const decoded = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
        const now = Math.floor(Date.now() / 1000);
        
        expect(decoded.exp!).toBeGreaterThan(now);
      });
    });

    describe('Security', () => {
      it('should not include sensitive data in payload', () => {
        const userId = 'user-security';
        const token = generateToken(userId);

        const decoded = jwt.decode(token) as jwt.JwtPayload;
        
        // Verificar que não há dados sensíveis no payload
        expect(decoded).not.toHaveProperty('password');
        expect(decoded).not.toHaveProperty('email');
        expect(decoded).not.toHaveProperty('creditCard');
      });

      it('should use strong signature algorithm', () => {
        const userId = 'user-algo';
        const token = generateToken(userId);

        const header = jwt.decode(token, { complete: true })?.header;
        
        expect(header).toBeDefined();
        // HS256 é o algoritmo padrão do jwt.sign (HMAC SHA256)
        expect(header?.alg).toBe('HS256');
      });
    });
  });
});

