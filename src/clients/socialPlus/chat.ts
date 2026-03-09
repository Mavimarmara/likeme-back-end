import { SocialPlusBase, SocialPlusResponse, Constructor } from './base';

export function ChatMixin<T extends Constructor<SocialPlusBase>>(Base: T) {
  return class extends Base {
    async getChannels(
      userAccessToken?: string,
      options?: { types?: string[]; filter?: 'member' | 'notMember' | 'all' }
    ): Promise<SocialPlusResponse<unknown>> {
      if (!this.apiKey) {
        return { success: false, error: 'Social.plus API key não configurado. Configure SOCIAL_PLUS_API_KEY nas variáveis de ambiente.' };
      }
      const params = new URLSearchParams();
      if (options?.filter && options.filter !== 'all') {
        params.set('filter', options.filter);
      }
      if (options?.types?.length) {
        params.set('types', options.types.join(','));
      }
      const query = params.toString();
      const endpoint = query ? `/v3/channels?${query}` : '/v3/channels';
      return this.requestWithFallback<unknown>('GET', endpoint, userAccessToken);
    }

    /**
     * Cria um canal de conversa 1:1 com o usuário informado.
     * Parâmetros conforme doc Amity: userId (obrigatório), displayName, avatarFileId, metaData, tags.
     * O channelId é sempre gerado pelo SDK. Se já existir conversa com o mesmo membro, a API retorna a existente.
     */
    async createConversationChannel(
      targetUserIds: string[],
      userAccessToken: string,
      options?: {
        displayName?: string;
        avatarFileId?: string;
        metaData?: Record<string, unknown>;
        tags?: string[];
      }
    ): Promise<SocialPlusResponse<{ channelId?: string }>> {
      if (!this.apiKey) {
        return { success: false, error: 'Social.plus API key não configurado.' };
      }
      const targetUserId = targetUserIds?.[0];
      if (!targetUserId) {
        return { success: false, error: 'Pelo menos um userId é obrigatório para criar conversa.' };
      }
      const body: Record<string, unknown> = {
        type: 'conversation',
        userId: targetUserId,
        displayName: options?.displayName ?? 'Conversation',
      };
      if (options?.avatarFileId) body.avatarFileId = options.avatarFileId;
      if (options?.metaData && Object.keys(options.metaData).length > 0) body.metaData = options.metaData;
      if (options?.tags?.length) body.tags = options.tags;

      const res = await this.makeRequest<{ channelId?: string }>(
        'POST',
        '/v3/channels',
        body,
        { useApiKey: true, bearerToken: userAccessToken }
      );
      return res;
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
