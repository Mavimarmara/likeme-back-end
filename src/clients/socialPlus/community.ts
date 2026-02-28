import { SocialPlusBase, SocialPlusResponse, Constructor } from './base';

export interface ListCommunitiesParams {
  userAccessToken?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  includeDeleted?: boolean;
}

export function CommunityMixin<T extends Constructor<SocialPlusBase>>(Base: T) {
  return class extends Base {
    async listCommunities(params?: ListCommunitiesParams): Promise<SocialPlusResponse<unknown>> {
      console.log('[SocialPlus] listCommunities chamado - query params removidos para evitar erro de validação da API');
      return this.requestWithFallback<unknown>('GET', '/v3/communities', params?.userAccessToken);
    }

    async addMemberToCommunity(
      communityId: string,
      userAccessToken: string
    ): Promise<SocialPlusResponse<{ success: boolean }>> {
      return this.makeRequest<{ success: boolean }>(
        'POST',
        `/v4/communities/${communityId}/join`,
        undefined,
        { useApiKey: true, bearerToken: userAccessToken }
      );
    }

    async addCommentReaction(
      commentId: string,
      reactionName: string,
      userAccessToken: string
    ): Promise<SocialPlusResponse<unknown>> {
      if (!userAccessToken) {
        return { success: false, error: 'Token de autenticação do usuário é obrigatório para reagir a comentários.' };
      }
      if (!reactionName || reactionName.trim() === '') {
        return { success: false, error: 'reactionName é obrigatório.' };
      }
      return this.makeRequest<unknown>(
        'POST',
        `/v3/comments/${commentId}/reactions`,
        { reaction: reactionName },
        { useApiKey: false, bearerToken: userAccessToken }
      );
    }

    async removeCommentReaction(
      commentId: string,
      reactionName: string,
      userAccessToken: string
    ): Promise<SocialPlusResponse<unknown>> {
      if (!userAccessToken) {
        return { success: false, error: 'Token de autenticação do usuário é obrigatório para remover reações.' };
      }
      if (!reactionName || reactionName.trim() === '') {
        return { success: false, error: 'reactionName é obrigatório.' };
      }
      return this.makeRequest<unknown>(
        'DELETE',
        `/v3/comments/${commentId}/reactions/${reactionName}`,
        undefined,
        { useApiKey: false, bearerToken: userAccessToken }
      );
    }
  };
}
