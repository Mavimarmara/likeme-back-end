import { SocialPlusBase, SocialPlusResponse, Constructor } from './base';

export interface SocialPlusUser {
  id?: string;
  username?: string;
  displayName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  metadata?: Record<string, unknown>;
}

export function UserMixin<T extends Constructor<SocialPlusBase>>(Base: T) {
  return class extends Base {
    async createUser(userData: SocialPlusUser): Promise<SocialPlusResponse<{ id: string }>> {
      return this.makeRequest<{ id: string }>('POST', '/v1/users', userData);
    }

    async getUser(
      userId: string,
      userAccessToken?: string,
      type: string = 'public'
    ): Promise<SocialPlusResponse<unknown>> {
      if (!this.apiKey) {
        return { success: false, error: 'Social.plus API key não configurado. Configure SOCIAL_PLUS_API_KEY nas variáveis de ambiente.' };
      }
      return this.requestWithFallback<unknown>('GET', `/v3/users/${userId}?type=${type}`, userAccessToken);
    }
  };
}
