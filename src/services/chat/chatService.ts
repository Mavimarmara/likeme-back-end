import { AmityChannelsResponse, AmityChannel } from '@/types/amity';
import { socialPlusClient, SocialPlusResponse } from '@/clients/socialPlus';
import { userTokenService } from '../user/userTokenService';
import prisma from '@/config/database';

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

    const response = await socialPlusClient.getChannels(userAccessToken, {
      filter: 'member',
      types,
    });

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
        .filter(ch => ch.channelId)
        .map(async (ch) => {
          try {
            const msgRes = await socialPlusClient.getMessages(ch.channelId!, userAccessToken, 5);
            const messages: any[] = (msgRes.data as any)?.messages ?? [];
            const latest =
              messages.length > 0
                ? messages.reduce((a, b) =>
                    new Date(b.createdAt).getTime() > new Date(a.createdAt).getTime() ? b : a
                  )
                : null;
            if (latest) {
              ch.lastMessagePreview = latest.data?.text || '';
              ch.lastMessageTimestamp = latest.createdAt || ch.lastActivity;
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
    if (!userId) throw new Error('Usuário não autenticado.');

    const userAccessToken = await this.getUserToken(userId);
    const response = await socialPlusClient.getMessages(channelId, userAccessToken, limit);

    if (!response.success) {
      throw new Error(response.error || 'Erro ao buscar mensagens do canal');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { socialPlusUserId: true },
    });

    return {
      success: true,
      data: { ...(response.data as object), currentUserId: user?.socialPlusUserId ?? userId },
    };
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

  /**
   * Cria um canal de conversa com o parceiro (advertiser) e opcionalmente envia a primeira mensagem.
   * Define displayName como "Nome Sobrenome / Nome Sobrenome" dos dois participantes.
   */
  async createChannel(
    userId: string | undefined,
    advertiserId: string,
    initialMessage?: string
  ): Promise<{ success: boolean; channelId?: string; error?: string }> {
    if (!userId) throw new Error('Usuário não autenticado.');
    const token = await this.getUserToken(userId);

    const [currentUser, advertiser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { person: { select: { firstName: true, lastName: true } } },
      }),
      prisma.advertiser.findUnique({
        where: { id: advertiserId, deletedAt: null },
        select: { userId: true },
      }),
    ]);

    if (!advertiser?.userId) {
      return { success: false, error: 'Parceiro não encontrado.' };
    }

    const partnerUser = await prisma.user.findUnique({
      where: { id: advertiser.userId },
      select: { socialPlusUserId: true, person: { select: { firstName: true, lastName: true } } },
    });
    if (!partnerUser?.socialPlusUserId) {
      return { success: false, error: 'Parceiro sem conta de chat configurada.' };
    }

    const currentName = [currentUser?.person?.firstName, currentUser?.person?.lastName].filter(Boolean).join(' ') || 'Usuário';
    const partnerName = [partnerUser.person?.firstName, partnerUser.person?.lastName].filter(Boolean).join(' ') || 'Contato';
    const displayName = `${currentName} / ${partnerName}`;

    const targetSocialPlusUserId = partnerUser.socialPlusUserId;
    const createRes = await socialPlusClient.createConversationChannel([targetSocialPlusUserId], token, {
      displayName,
    });
    if (!createRes.success || !createRes.data) {
      return { success: false, error: createRes.error || 'Erro ao criar conversa.' };
    }

    const data = createRes.data as Record<string, unknown>;
    const channelId =
      (data.channelId as string) ||
      (data.channel as { channelId?: string })?.channelId ||
      (Array.isArray(data.channels) && (data.channels[0] as { channelId?: string })?.channelId);
    if (!channelId) {
      return { success: false, error: 'Resposta da API sem channelId.' };
    }

    if (initialMessage && initialMessage.trim()) {
      const sendRes = await socialPlusClient.sendMessage(channelId, initialMessage.trim(), token);
      if (!sendRes.success) {
        console.warn('[createChannel] Channel created but failed to send initial message:', sendRes.error);
      }
    }

    return { success: true, channelId };
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
