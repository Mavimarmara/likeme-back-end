import { SocialPlusBase, SocialPlusResponse, Constructor } from './base';

export function ChatMixin<T extends Constructor<SocialPlusBase>>(Base: T) {
  return class extends Base {
    async getChannels(userAccessToken?: string): Promise<SocialPlusResponse<unknown>> {
      if (!this.apiKey) {
        return { success: false, error: 'Social.plus API key não configurado. Configure SOCIAL_PLUS_API_KEY nas variáveis de ambiente.' };
      }
      return this.requestWithFallback<unknown>('GET', '/v3/channels', userAccessToken);
    }

    async getMessages(
      channelId: string,
      userAccessToken: string,
      limit = 1
    ): Promise<SocialPlusResponse<unknown>> {
      const endpoint = `/v3/messages?channelId=${encodeURIComponent(channelId)}&limit=${limit}`;
      return this.makeRequest<unknown>('GET', endpoint, undefined, {
        useApiKey: true,
        bearerToken: userAccessToken,
      });
    }
  };
}
