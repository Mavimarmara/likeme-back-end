/**
 * Testes Unitários - PrismaUserRepository
 */

import { PrismaUserRepository } from '../PrismaUserRepository';
import prisma from '@/config/database';

// Mock do Prisma
jest.mock('@/config/database', () => ({
  __esModule: true,
  default: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    personContact: {
      count: jest.fn(),
    },
  },
}));

describe('PrismaUserRepository', () => {
  let repository: PrismaUserRepository;

  beforeEach(() => {
    repository = new PrismaUserRepository();
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('deve criar um novo usuário', async () => {
      const userData = {
        personId: 'person-123',
        username: 'testuser',
        password: 'hashed-password',
        avatar: 'avatar-url',
      };

      const mockCreatedUser = { id: 'user-123' };
      (prisma.user.create as jest.Mock).mockResolvedValue(mockCreatedUser);

      const result = await repository.save(userData);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          personId: userData.personId,
          username: userData.username,
          password: userData.password,
          avatar: userData.avatar,
          isActive: true,
          socialPlusUserId: undefined,
        },
        select: { id: true },
      });
      expect(result).toEqual({ id: 'user-123' });
    });
  });

  describe('findById', () => {
    it('deve retornar usuário quando encontrado', async () => {
      const mockUser = {
        id: 'user-123',
        personId: 'person-123',
        username: 'testuser',
        password: 'hashed',
        avatar: null,
        isActive: true,
        socialPlusUserId: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        deletedAt: null,
        person: {
          id: 'person-123',
          firstName: 'Test',
          lastName: 'User',
          surname: null,
          nationalRegistration: null,
          birthdate: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          contacts: [
            {
              id: 'contact-123',
              type: 'email',
              value: 'test@example.com',
              createdAt: new Date('2024-01-01'),
              deletedAt: null,
            },
          ],
        },
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await repository.findById('user-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('user-123');
      expect(result?.username).toBe('testuser');
    });

    it('deve retornar null quando usuário não existe', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });

    it('deve retornar null quando usuário está deletado', async () => {
      const mockDeletedUser = {
        id: 'user-123',
        deletedAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockDeletedUser);

      const result = await repository.findById('user-123');

      expect(result).toBeNull();
    });
  });

  describe('existsByEmail', () => {
    it('deve retornar true quando email existe', async () => {
      (prisma.personContact.count as jest.Mock).mockResolvedValue(1);

      const result = await repository.existsByEmail('test@example.com');

      expect(result).toBe(true);
    });

    it('deve retornar false quando email não existe', async () => {
      (prisma.personContact.count as jest.Mock).mockResolvedValue(0);

      const result = await repository.existsByEmail('nonexistent@example.com');

      expect(result).toBe(false);
    });
  });

  describe('existsByUsername', () => {
    it('deve retornar true quando username existe', async () => {
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      const result = await repository.existsByUsername('testuser');

      expect(result).toBe(true);
    });

    it('deve retornar false quando username não existe', async () => {
      (prisma.user.count as jest.Mock).mockResolvedValue(0);

      const result = await repository.existsByUsername('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('update', () => {
    it('deve atualizar dados do usuário', async () => {
      const updateData = {
        username: 'newusername',
        avatar: 'new-avatar-url',
        isActive: false,
      };

      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await repository.update('user-123', updateData);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          username: 'newusername',
          password: undefined,
          avatar: 'new-avatar-url',
          isActive: false,
          socialPlusUserId: undefined,
        },
      });
    });
  });

  describe('delete', () => {
    it('deve fazer soft delete do usuário', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await repository.delete('user-123');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          deletedAt: expect.any(Date),
          isActive: false,
        },
      });
    });
  });
});

