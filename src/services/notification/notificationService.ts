import * as admin from 'firebase-admin';
import { getMessaging } from '@/config/firebase';
import { NotificationRepository } from '@/repositories/notification/NotificationRepository';
import { PrismaNotificationRepository } from '@/repositories/notification/PrismaNotificationRepository';

export interface SendNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface SendResult {
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
}

export class NotificationService {
  private repository: NotificationRepository;

  constructor(repository?: NotificationRepository) {
    this.repository = repository || new PrismaNotificationRepository();
  }

  async registerToken(userId: string, token: string, platform: string) {
    return this.repository.upsertToken(userId, token, platform);
  }

  async unregisterToken(token: string) {
    return this.repository.removeToken(token);
  }

  async deactivateUserTokens(userId: string) {
    return this.repository.deactivateUserTokens(userId);
  }

  async sendToUser(userId: string, payload: SendNotificationPayload): Promise<SendResult> {
    const tokens = await this.repository.getActiveTokensByUserId(userId);
    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    return this.sendToTokens(
      tokens.map((t) => t.token),
      payload,
    );
  }

  async sendToUsers(userIds: string[], payload: SendNotificationPayload): Promise<SendResult> {
    const tokens = await this.repository.getActiveTokensByUserIds(userIds);
    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    return this.sendToTokens(
      tokens.map((t) => t.token),
      payload,
    );
  }

  async sendToAll(payload: SendNotificationPayload): Promise<SendResult> {
    const tokens = await this.repository.getAllActiveTokens();
    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    return this.sendToTokens(
      tokens.map((t) => t.token),
      payload,
    );
  }

  async sendToTopic(topic: string, payload: SendNotificationPayload): Promise<string> {
    const messaging = getMessaging();

    const message: admin.messaging.Message = {
      topic,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
      },
      data: payload.data,
    };

    return messaging.send(message);
  }

  private async sendToTokens(tokens: string[], payload: SendNotificationPayload): Promise<SendResult> {
    const messaging = getMessaging();
    const invalidTokens: string[] = [];

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
      },
      data: payload.data,
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        const errorCode = resp.error.code;
        if (
          errorCode === 'messaging/invalid-registration-token' ||
          errorCode === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(tokens[idx]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      await Promise.all(invalidTokens.map((token) => this.repository.removeToken(token)));
    }

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokens,
    };
  }
}

export const notificationService = new NotificationService();
