import { AmityUserFeedResponse, AmityUserFeedData, AmityChannelsResponse, AmityChannel, AmityReactionResponse, AmityPost } from '@/types/amity';
import { socialPlusClient, SocialPlusResponse } from '@/clients/socialPlus/socialPlusClient';
import { userTokenService } from '../user/userTokenService';
import { normalizeAmityResponse, buildAmityFeedResponse, filterPostsBySearch } from '@/utils/amityResponseNormalizer';
import prisma from '@/config/database';
import type {
  AddCommunitiesResult,
  FeedOrderBy,
  FeedFilterOptions,
} from '@/interfaces/community/community';

export type { FeedOrderBy } from '@/interfaces/community/community';

export class CommunityService {
  async getUserFeed(
    userId: string | undefined,
    page: number,
    limit: number,
    userToken?: string,
    search?: string,
    filters?: FeedFilterOptions
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

    // Aplica filtros avançados
    filteredPosts = applyFeedFilters(filteredPosts, filters);
    
    // Atualiza feedData com posts filtrados
    const filteredFeedData: AmityUserFeedData = {
      ...feedData,
      posts: filteredPosts,
    };
    
    console.log('[CommunityService] feedData.posts (após normalização e filtro):', JSON.stringify(filteredFeedData.posts, null, 2));
    console.log(`[CommunityService] Total de posts (após normalização e filtro): ${filteredFeedData.posts?.length || 0}`);
    
    return buildAmityFeedResponse(filteredFeedData, status, page, limit, token);
  }

  async listCommunities(
    userId: string | undefined,
    page: number = 1,
    limit: number = 10,
    sortBy?: string,
    includeDeleted: boolean = false,
    userToken?: string
  ): Promise<SocialPlusResponse<unknown>> {
    let token = userToken;

    if (!token && userId) {
      const tokenResult = await userTokenService.getToken(userId, false);
      token = tokenResult.token || undefined;
    }

    // Chama a API sem query params (a API não aceita)
    const response = await socialPlusClient.listCommunities({
      userAccessToken: token,
    });

    if (!response.success || !response.data) {
      return response;
    }

    // Aplica filtros e paginação localmente
    const data = response.data as {
      communities?: Array<Record<string, unknown>>;
      communityUsers?: Array<Record<string, unknown>>;
      files?: Array<Record<string, unknown>>;
      users?: Array<Record<string, unknown>>;
      categories?: Array<Record<string, unknown>>;
      feeds?: Array<Record<string, unknown>>;
      paging?: { next?: string; previous?: string };
    };

    let communities = data.communities || [];

    // Filtra comunidades deletadas se necessário
    if (!includeDeleted) {
      communities = communities.filter(
        (community) => !community.isDeleted || community.isDeleted === false
      );
    }

    // Aplica ordenação se necessário
    if (sortBy) {
      communities.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return aValue.localeCompare(bValue);
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return aValue - bValue;
        }
        
        if (aValue instanceof Date && bValue instanceof Date) {
          return aValue.getTime() - bValue.getTime();
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          // Tenta parsear como data ISO
          const aDate = new Date(aValue);
          const bDate = new Date(bValue);
          if (!Number.isNaN(aDate.getTime()) && !Number.isNaN(bDate.getTime())) {
            return aDate.getTime() - bDate.getTime();
          }
        }
        
        return String(aValue).localeCompare(String(bValue));
      });
    }

    // Aplica paginação
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCommunities = communities.slice(startIndex, endIndex);
    const total = communities.length;
    const totalPages = Math.ceil(total / limit);

    // Retorna dados paginados mantendo a estrutura original
    return {
      success: true,
      data: {
        communities: paginatedCommunities,
        communityUsers: data.communityUsers || [],
        files: data.files || [],
        users: data.users || [],
        categories: data.categories || [],
        feeds: data.feeds || [],
        paging: data.paging || { next: undefined, previous: undefined },
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    };
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

  async getChannels(
    userId: string | undefined,
    types?: ('conversation' | 'broadcast' | 'live' | 'community')[]
  ): Promise<AmityChannelsResponse> {
    try {
      if (!userId) {
        throw new Error('Usuário não autenticado. Faça login para obter channels.');
      }

      const tokenResult = await userTokenService.getToken(userId, false);
      const userAccessToken = tokenResult.token || undefined;

      if (!userAccessToken) {
        throw new Error('Token de acesso do usuário não disponível. Faça login novamente.');
      }

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
        unreadCount: channel.unreadCount,
        isMuted: channel.isMuted,
        isFlaggedByMe: channel.isFlaggedByMe,
        createdAt: channel.createdAt,
        updatedAt: channel.updatedAt,
        lastActivity: channel.lastActivity,
        ...channel,
      }));

      const hasNextPage = !!(data.paging && data.paging.next);

      return {
        channels,
        hasNextPage,
        loading: false,
        error: null,
      };
    } catch (error) {
      console.error('[CommunityService] Erro ao buscar channels:', error);
      throw error;
    }
  }

  async addCommentReaction(
    userId: string | undefined,
    commentId: string,
    reactionName: string = 'like'
  ): Promise<AmityReactionResponse> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'Usuário não autenticado. Faça login para reagir a comentários.',
        };
      }

      const tokenResult = await userTokenService.getToken(userId, true);
      if (!tokenResult.token) {
        return {
          success: false,
          error: tokenResult.error || 'Não foi possível obter o token do usuário.',
        };
      }

      const response = await socialPlusClient.addCommentReaction(
        commentId,
        reactionName,
        tokenResult.token
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Erro ao adicionar reação ao comentário',
        };
      }

      return {
        success: true,
        message: 'Reação adicionada com sucesso',
      };
    } catch (error) {
      console.error('[CommunityService] Erro ao adicionar reação ao comentário:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async removeCommentReaction(
    userId: string | undefined,
    commentId: string,
    reactionName: string = 'like'
  ): Promise<AmityReactionResponse> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'Usuário não autenticado. Faça login para remover reações.',
        };
      }

      const tokenResult = await userTokenService.getToken(userId, true);
      if (!tokenResult.token) {
        return {
          success: false,
          error: tokenResult.error || 'Não foi possível obter o token do usuário.',
        };
      }

      const response = await socialPlusClient.removeCommentReaction(
        commentId,
        reactionName,
        tokenResult.token
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Erro ao remover reação do comentário',
        };
      }

      return {
        success: true,
        message: 'Reação removida com sucesso',
      };
    } catch (error) {
      console.error('[CommunityService] Erro ao remover reação do comentário:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

export const communityService = new CommunityService();

const resolvePostType = (post: AmityPost): string | undefined => {
  return (
    post.structureType ||
    post.dataType ||
    (typeof post.data === 'object' && post.data && 'type' in post.data
      ? String((post.data as { type?: unknown }).type)
      : undefined)
  )?.toLowerCase();
};

const parseDate = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const applyFeedFilters = (
  posts: AmityPost[] | undefined,
  filters?: FeedFilterOptions
): AmityPost[] | undefined => {
  if (!posts || !filters) {
    return posts;
  }

  let filtered = posts;

  if (filters.postTypes && filters.postTypes.length > 0) {
    const allowedTypes = filters.postTypes.map((type) => type.toLowerCase());
    filtered = filtered.filter((post) => {
      const postType = resolvePostType(post);
      return postType ? allowedTypes.includes(postType) : false;
    });
  }

  if (filters.authorIds && filters.authorIds.length > 0) {
    const allowedAuthors = new Set(filters.authorIds);
    filtered = filtered.filter((post) => {
      return post.postedUserId ? allowedAuthors.has(post.postedUserId) : false;
    });
  }

  if (filters.startDate) {
    const startTime = filters.startDate.getTime();
    filtered = filtered.filter((post) => {
      const createdAt = parseDate(post.createdAt);
      return createdAt ? createdAt.getTime() >= startTime : false;
    });
  }

  if (filters.endDate) {
    const endTime = filters.endDate.getTime();
    filtered = filtered.filter((post) => {
      const createdAt = parseDate(post.createdAt);
      return createdAt ? createdAt.getTime() <= endTime : false;
    });
  }

  if (filters.orderBy) {
    const multiplier = filters.order === 'asc' ? 1 : -1;
    const orderBy = filters.orderBy;
    filtered = [...filtered].sort((a, b) => {
      const getComparable = (post: AmityPost) => {
        switch (orderBy) {
          case 'updatedAt':
            return parseDate(post.updatedAt)?.getTime() ?? 0;
          case 'reactionsCount':
            return post.reactionsCount ?? 0;
          case 'createdAt':
          default:
            return parseDate(post.createdAt)?.getTime() ?? 0;
        }
      };

      const aValue = getComparable(a);
      const bValue = getComparable(b);

      if (aValue === bValue) return 0;
      return aValue > bValue ? multiplier : -multiplier;
    });
  }

  return filtered;
};

