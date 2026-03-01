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
      limit = 1,
      sortBy: 'firstCreated' | 'lastCreated' = 'lastCreated'
    ): Promise<SocialPlusResponse<unknown>> {
      const params = new URLSearchParams({
        channelId,
        limit: String(limit),
        'options[sortBy]': sortBy,
      });
      return this.makeRequest<unknown>('GET', `/v3/messages?${params}`, undefined, {
        useApiKey: true,
        bearerToken: userAccessToken,
      });
    }

    async sendMessage(
      channelId: string,
      text: string,
      userAccessToken: string
    ): Promise<SocialPlusResponse<unknown>> {
      return this.makeRequest<unknown>(
        'POST',
        '/v3/messages',
        {
          channelId,
          data: { text },
          type: 'text',
        },
        { useApiKey: true, bearerToken: userAccessToken }
      );
    }

    async leaveChannel(
      channelId: string,
      userAccessToken: string
    ): Promise<SocialPlusResponse<unknown>> {
      return this.makeRequest<unknown>(
        'DELETE',
        `/v3/channels/${encodeURIComponent(channelId)}/join`,
        undefined,
        { useApiKey: true, bearerToken: userAccessToken }
      );
    }
  };
}
