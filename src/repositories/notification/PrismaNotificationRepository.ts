import { DeviceToken } from '@prisma/client';
import prisma from '@/config/database';
import { NotificationRepository } from './NotificationRepository';

export class PrismaNotificationRepository implements NotificationRepository {
  async upsertToken(userId: string, token: string, platform: string): Promise<DeviceToken> {
    return prisma.deviceToken.upsert({
      where: { userId_token: { userId, token } },
      update: { platform, isActive: true, deletedAt: null },
      create: { userId, token, platform },
    });
  }

  async removeToken(token: string): Promise<void> {
    await prisma.deviceToken.updateMany({
      where: { token },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  async deactivateUserTokens(userId: string): Promise<void> {
    await prisma.deviceToken.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
  }

  async getActiveTokensByUserId(userId: string): Promise<DeviceToken[]> {
    return prisma.deviceToken.findMany({
      where: { userId, isActive: true, deletedAt: null },
    });
  }

  async getActiveTokensByUserIds(userIds: string[]): Promise<DeviceToken[]> {
    return prisma.deviceToken.findMany({
      where: { userId: { in: userIds }, isActive: true, deletedAt: null },
    });
  }

  async getAllActiveTokens(): Promise<DeviceToken[]> {
    return prisma.deviceToken.findMany({
      where: { isActive: true, deletedAt: null },
    });
  }
}
