import { AmityUserFeedResponse, AmityUserFeedData } from '@/types/amity';
import { socialPlusClient, SocialPlusResponse } from '@/clients/socialPlus/socialPlusClient';
import { userTokenService } from './userTokenService';
import { normalizeAmityResponse, buildAmityFeedResponse } from '@/utils/amityResponseNormalizer';

export interface AddCommunitiesResult {
  added: number;
  failed: number;
  errors: string[];
}

export class CommunityService {
  async getUserFeed(
    userId: string | undefined,
    page: number,
    limit: number,
    userToken?: string
  ): Promise<AmityUserFeedResponse & { pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
    let token = userToken;

    if (!token && userId) {
      const tokenResult = await userTokenService.getToken(userId, false);
      token = tokenResult.token || undefined;
    }

    const response = await socialPlusClient.getUserFeed({
      page,
      limit,
      userAccessToken: token,
    });

    if (!response.success) {
      throw new Error(response.error || 'Erro ao obter feed do usuário');
    }

    const apiResponse = response.data as AmityUserFeedResponse | AmityUserFeedData | undefined;
    
    if (apiResponse) {
      const postsBeforeNormalize = ('data' in apiResponse && apiResponse.data?.posts) || ('posts' in apiResponse ? apiResponse.posts : undefined);
      console.log('[CommunityService] response.data.posts (getUserFeed):', JSON.stringify(postsBeforeNormalize, null, 2));
      console.log(`[CommunityService] Total de posts (getUserFeed): ${postsBeforeNormalize?.length || 0}`);
    }
    
    const { feedData, status } = normalizeAmityResponse(apiResponse);
    
    console.log('[CommunityService] feedData.posts (após normalização):', JSON.stringify(feedData.posts, null, 2));
    console.log(`[CommunityService] Total de posts (após normalização): ${feedData.posts?.length || 0}`);
    
    return buildAmityFeedResponse(feedData, status, page, limit);
  }

  async addUserToAllCommunities(
    userId: string,
    userToken: string
  ): Promise<AddCommunitiesResult> {
    const result: AddCommunitiesResult = { added: 0, failed: 0, errors: [] };

    try {
      let allCommunities: unknown[] = [];
      let page = 1;
      const limit = 100;
      let hasMore = true;
      const maxPages = 50;

      while (hasMore && page <= maxPages) {
        const response = await socialPlusClient.listCommunities({
          userAccessToken: userToken,
          page,
          limit,
          includeDeleted: false,
        });

        if (!response.success) {
          console.warn(`[CommunityService] Erro ao listar comunidades na página ${page}:`, response.error);
          break;
        }

        const communities = (response.data as { communities?: unknown[] })?.communities ?? [];
        if (communities.length === 0) {
          hasMore = false;
          break;
        }

        allCommunities = allCommunities.concat(communities);

        const paging = (response.data as { paging?: { next?: string } })?.paging;
        hasMore = !!paging?.next && communities.length === limit;
        page++;
      }

      if (allCommunities.length === 0) {
        console.log('[CommunityService] Nenhuma comunidade encontrada para adicionar o usuário');
        return result;
      }

      console.log(`[CommunityService] Encontradas ${allCommunities.length} comunidades. Adicionando usuário ${userId} a todas...`);

      const batchSize = 10;
      for (let i = 0; i < allCommunities.length; i += batchSize) {
        const batch = allCommunities.slice(i, i + batchSize);
        const batchPromises = batch.map(async (community) => {
          const communityId = (community as { communityId?: string; id?: string; _id?: string }).communityId || 
                              (community as { id?: string }).id || 
                              (community as { _id?: string })._id;
          if (!communityId) {
            console.warn('[CommunityService] Comunidade sem ID válido, pulando:', community);
            return { success: false, communityId: null, error: 'ID inválido' };
          }

          try {
            const addResponse = await socialPlusClient.addMemberToCommunity(communityId, userToken);
            if (addResponse.success) {
              console.log(`[CommunityService] Usuário ${userId} adicionado à comunidade ${communityId}`);
              return { success: true, communityId, error: null };
            } else {
              const errorMsg = addResponse.error || 'Erro desconhecido';
              console.warn(`[CommunityService] Falha ao adicionar usuário à comunidade ${communityId}:`, errorMsg);
              return { success: false, communityId, error: errorMsg };
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error(`[CommunityService] Erro ao adicionar usuário à comunidade ${communityId}:`, error);
            return { success: false, communityId, error: errorMsg };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        
        for (const batchResult of batchResults) {
          if (batchResult.success) {
            result.added++;
          } else if (batchResult.communityId) {
            result.failed++;
            result.errors.push(`Comunidade ${batchResult.communityId}: ${batchResult.error}`);
          }
        }
      }

      console.log(`[CommunityService] Processo concluído: ${result.added} comunidades adicionadas, ${result.failed} falhas`);
      return result;
    } catch (error) {
      console.error('[CommunityService] Erro ao adicionar usuário a todas as comunidades:', error);
      throw error;
    }
  }
}

export const communityService = new CommunityService();

