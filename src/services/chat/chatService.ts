import { AmityChannelsResponse, AmityChannel } from '@/types/amity';
import { socialPlusClient, SocialPlusResponse } from '@/clients/socialPlus';
import { userTokenService } from '../user/userTokenService';

class ChatService {
  private async getUserToken(userId: string | undefined): Promise<string> {
    if (!userId) {
      throw new Error('Usuário não autenticado.');
    }

    const tokenResult = await userTokenService.getToken(userId, false);
    if (!tokenResult.token) {
      throw new Error('Token de acesso do usuário não disponível.');
    }

    return tokenResult.token;
  }

  async getChannels(
    userId: string | undefined,
    types?: ('conversation' | 'broadcast' | 'live' | 'community')[]
  ): Promise<AmityChannelsResponse> {
    const userAccessToken = await this.getUserToken(userId);

    const response = await socialPlusClient.getChannels(userAccessToken);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erro ao buscar channels da API');
    }

    const data = response.data as any;
    let channelsData = data.channels || [];

    if (types && types.length > 0) {
      const typesLower = types.map(t => t.toLowerCase());
      channelsData = channelsData.filter((channel: any) => {
        const channelType = channel.type?.toLowerCase();
        return channelType && typesLower.includes(channelType);
      });
    }

    const channels: AmityChannel[] = channelsData.map((channel: any) => ({
      channelId: channel.channelId,
      displayName: channel.displayName,
      description: channel.description,
      avatarFileId: channel.avatarFileId,
      type: channel.type,
      metadata: channel.metadata,
      memberCount: channel.memberCount,
      messageCount: channel.messageCount,
      unreadCount: channel.unreadCount,
      isMuted: channel.isMuted,
      isFlaggedByMe: channel.isFlaggedByMe,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
      lastActivity: channel.lastActivity,
      ...channel,
    }));

    await Promise.all(
      channels
        .filter(ch => (ch.messageCount as number) > 0 && ch.channelId)
        .map(async (ch) => {
          try {
            const msgRes = await socialPlusClient.getMessages(ch.channelId!, userAccessToken!, 1);
            const messages = (msgRes.data as any)?.messages;
            if (messages?.[0]?.data?.text) {
              ch.lastMessagePreview = messages[0].data.text;
            }
          } catch {
            // silently ignore per-channel errors
          }
        })
    );

    const hasNextPage = !!(data.paging && data.paging.next);

    return {
      channels,
      hasNextPage,
      loading: false,
      error: null,
    };
  }

  async getChannelMessages(
    userId: string | undefined,
    channelId: string,
    limit = 20
  ): Promise<SocialPlusResponse<unknown>> {
    const userAccessToken = await this.getUserToken(userId);
    const response = await socialPlusClient.getMessages(channelId, userAccessToken, limit);

    if (!response.success) {
      throw new Error(response.error || 'Erro ao buscar mensagens do canal');
    }

    return { success: true, data: response.data };
  }

  async sendMessage(
    userId: string | undefined,
    channelId: string,
    text: string
  ): Promise<SocialPlusResponse<unknown>> {
    const token = await this.getUserToken(userId);
    return socialPlusClient.sendMessage(channelId, text, token);
  }

  async leaveChannel(
    userId: string | undefined,
    channelId: string
  ): Promise<SocialPlusResponse<unknown>> {
    const token = await this.getUserToken(userId);
    return socialPlusClient.leaveChannel(channelId, token);
  }

  async blockUser(
    userId: string | undefined,
    targetUserId: string
  ): Promise<SocialPlusResponse<unknown>> {
    const token = await this.getUserToken(userId);
    return socialPlusClient.blockUser(targetUserId, token);
  }

  async unblockUser(
    userId: string | undefined,
    targetUserId: string
  ): Promise<SocialPlusResponse<unknown>> {
    const token = await this.getUserToken(userId);
    return socialPlusClient.unblockUser(targetUserId, token);
  }

  async getBlockedUsers(
    userId: string | undefined
  ): Promise<SocialPlusResponse<unknown>> {
    const token = await this.getUserToken(userId);
    return socialPlusClient.getBlockedUsers(token);
  }
}

export const chatService = new ChatService();
export { ChatService };
