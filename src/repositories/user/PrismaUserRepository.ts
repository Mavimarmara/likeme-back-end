/**
 * PrismaUserRepository - Implementação com Prisma
 * 
 * Implementa a interface UserRepository usando Prisma ORM.
 */

import prisma from '@/config/database';
import type {
  UserRepository,
  CreateUserData,
  UserData,
  UpdateUserData,
} from './UserRepository';

export class PrismaUserRepository implements UserRepository {
  /**
   * Salva um novo usuário
   */
  async save(userData: CreateUserData): Promise<{ id: string }> {
    const user = await prisma.user.create({
      data: {
        personId: userData.personId,
        username: userData.username,
        password: userData.password,
        avatar: userData.avatar,
        isActive: userData.isActive ?? true,
        socialPlusUserId: userData.socialPlusUserId,
      },
      select: {
        id: true,
      },
    });

    return { id: user.id };
  }

  /**
   * Busca usuário por ID com todas as relações
   */
  async findById(id: string): Promise<UserData | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        person: {
          include: {
            contacts: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      return null;
    }

    return this.mapToUserData(user);
  }

  /**
   * Busca usuário por email
   */
  async findByEmail(email: string): Promise<UserData | null> {
    const user = await prisma.user.findFirst({
      where: {
        person: {
          contacts: {
            some: {
              type: 'email',
              value: email,
              deletedAt: null,
            },
          },
        },
        deletedAt: null,
      },
      include: {
        person: {
          include: {
            contacts: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return this.mapToUserData(user);
  }

  /**
   * Busca usuário por username
   */
  async findByUsername(username: string): Promise<UserData | null> {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        person: {
          include: {
            contacts: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      return null;
    }

    return this.mapToUserData(user);
  }

  /**
   * Verifica se email já existe
   */
  async existsByEmail(email: string): Promise<boolean> {
    const count = await prisma.personContact.count({
      where: {
        type: 'email',
        value: email,
        deletedAt: null,
      },
    });

    return count > 0;
  }

  /**
   * Verifica se username já existe
   */
  async existsByUsername(username: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: {
        username,
        deletedAt: null,
      },
    });

    return count > 0;
  }

  /**
   * Atualiza dados do usuário
   */
  async update(id: string, userData: UpdateUserData): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: {
        username: userData.username,
        password: userData.password,
        avatar: userData.avatar,
        isActive: userData.isActive,
        socialPlusUserId: userData.socialPlusUserId,
      },
    });
  }

  /**
   * Remove usuário (soft delete)
   */
  async delete(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  /**
   * Mapeia do modelo Prisma para UserData
   * Isola a conversão entre camadas
   */
  private mapToUserData(prismaUser: any): UserData {
    return {
      id: prismaUser.id,
      personId: prismaUser.personId,
      username: prismaUser.username,
      password: prismaUser.password,
      avatar: prismaUser.avatar,
      isActive: prismaUser.isActive,
      socialPlusUserId: prismaUser.socialPlusUserId,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
      deletedAt: prismaUser.deletedAt,
      person: {
        id: prismaUser.person.id,
        firstName: prismaUser.person.firstName,
        lastName: prismaUser.person.lastName,
        surname: prismaUser.person.surname,
        nationalRegistration: prismaUser.person.nationalRegistration,
        birthdate: prismaUser.person.birthdate,
        createdAt: prismaUser.person.createdAt,
        updatedAt: prismaUser.person.updatedAt,
        contacts: prismaUser.person.contacts.map((contact: any) => ({
          id: contact.id,
          type: contact.type,
          value: contact.value,
          createdAt: contact.createdAt,
          deletedAt: contact.deletedAt,
        })),
      },
    };
  }
}




