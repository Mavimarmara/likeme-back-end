import { DeviceToken } from '@prisma/client';

export interface NotificationRepository {
  upsertToken(userId: string, token: string, platform: string): Promise<DeviceToken>;
  removeToken(token: string): Promise<void>;
  deactivateUserTokens(userId: string): Promise<void>;
  getActiveTokensByUserId(userId: string): Promise<DeviceToken[]>;
  getActiveTokensByUserIds(userIds: string[]): Promise<DeviceToken[]>;
  getAllActiveTokens(): Promise<DeviceToken[]>;
}
