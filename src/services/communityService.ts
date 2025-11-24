import { AmityUserFeedResponse, AmityUserFeedData } from '@/types/amity';
import { socialPlusClient, SocialPlusResponse } from '@/clients/socialPlus/socialPlusClient';
import { userTokenService } from './userTokenService';
import { normalizeAmityResponse, buildAmityFeedResponse, filterPostsBySearch } from '@/utils/amityResponseNormalizer';

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
    userToken?: string,
    search?: string
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
      search,
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
    
    console.log('[CommunityService] postChildren recebidos da API:', JSON.stringify(feedData.postChildren, null, 2));
    console.log(`[CommunityService] Total de postChildren: ${feedData.postChildren?.length || 0}`);
    
    if (feedData.postChildren && feedData.postChildren.length > 0) {
      feedData.postChildren.forEach((child, index) => {
        console.log(`[CommunityService] postChildren[${index}]:`, {
          id: child.postId || child._id,
          parentPostId: child.parentPostId,
          dataType: child.dataType,
          data: child.data,
          dataText: child.data?.text,
          dataTitle: child.data?.title,
          sequenceNumber: child.sequenceNumber,
        });
      });
    }
    
    // Aplica filtro de busca nos campos de texto e título se search for fornecido
    let filteredPosts = feedData.posts;
    if (search && search.trim() !== '') {
      const postsBeforeFilter = feedData.posts || [];
      filteredPosts = filterPostsBySearch(postsBeforeFilter, search);
      console.log(`[CommunityService] Busca aplicada: "${search}" - ${postsBeforeFilter.length} posts antes, ${filteredPosts.length} posts após filtro`);
    }
    
    // Atualiza feedData com posts filtrados
    const filteredFeedData: AmityUserFeedData = {
      ...feedData,
      posts: filteredPosts,
    };
    
    console.log('[CommunityService] feedData.posts (após normalização e filtro):', JSON.stringify(filteredFeedData.posts, null, 2));
    console.log(`[CommunityService] Total de posts (após normalização e filtro): ${filteredFeedData.posts?.length || 0}`);
    
    return buildAmityFeedResponse(filteredFeedData, status, page, limit, token);
  }

  async votePoll(
    userId: string | undefined,
    pollId: string,
    answerIds: string[],
    userToken?: string
  ): Promise<SocialPlusResponse<unknown>> {
    let token = userToken;

    if (!token && userId) {
      const tokenResult = await userTokenService.getToken(userId, false);
      token = tokenResult.token || undefined;
    }

    if (!token) {
      return {
        success: false,
        error: 'Token de autenticação do usuário necessário para votar em poll',
      };
    }

    return socialPlusClient.votePoll(pollId, answerIds, token);
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

