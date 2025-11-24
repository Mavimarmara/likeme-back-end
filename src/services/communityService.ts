import { AmityUserFeedResponse, AmityUserFeedData, AmityChannelsResponse, AmityChannel, AmityReactionResponse, AmityPost } from '@/types/amity';
import { socialPlusClient, SocialPlusResponse } from '@/clients/socialPlus/socialPlusClient';
import { userTokenService } from './userTokenService';
import { normalizeAmityResponse, buildAmityFeedResponse, filterPostsBySearch } from '@/utils/amityResponseNormalizer';
import { getAmityClient, isAmityReady, loginToAmity, initializeAmityClient } from '@/utils/amityClient';
import prisma from '@/config/database';

export interface AddCommunitiesResult {
  added: number;
  failed: number;
  errors: string[];
}

export type FeedOrderBy = 'createdAt' | 'updatedAt' | 'reactionsCount';

export interface FeedFilterOptions {
  postTypes?: string[];
  authorIds?: string[];
  startDate?: Date;
  endDate?: Date;
  orderBy?: FeedOrderBy;
  order?: 'asc' | 'desc';
}

const ensureAmityClientReady = async (): Promise<void> => {
  if (!isAmityReady()) {
    try {
      await initializeAmityClient();
    } catch (error) {
      console.error('[Amity] Erro ao inicializar cliente:', error);
    }
  }

  if (!isAmityReady()) {
    throw new Error('SDK do Amity não está inicializado. Verifique as configurações.');
  }
};

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
      await ensureAmityClientReady();

      // Garantir que o usuário está logado no SDK
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { 
            socialPlusUserId: true,
            person: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        });
        
        if (user?.socialPlusUserId) {
          const displayName = user.person?.firstName && user.person?.lastName 
            ? `${user.person.firstName} ${user.person.lastName}` 
            : user.socialPlusUserId;
          await loginToAmity(user.socialPlusUserId, displayName);
        }
      }

      // Dynamic import do SDK do Amity
      const amityModule = await import('@amityco/ts-sdk').catch(() => null);
      if (!amityModule) {
        throw new Error('SDK do Amity não encontrado. Execute: npm install @amityco/ts-sdk');
      }

      const { ChannelRepository } = amityModule;

      // Preparar parâmetros de filtro
      const params: { types?: ('conversation' | 'broadcast' | 'live' | 'community')[] } = {};
      if (types && types.length > 0) {
        params.types = types;
      }

      // Promise para aguardar a resposta do callback
      return new Promise<AmityChannelsResponse>((resolve, reject) => {
        let channels: AmityChannel[] = [];
        let hasNextPage = false;
        let loading = true;
        let error: Error | null = null;
        let resolved = false;

        const unsubscriber = ChannelRepository.getChannels(
          params,
          ({ data: channelsData, onNextPage, hasNextPage: hasMore, loading: isLoading, error: channelError }) => {
            if (channelError) {
              error = channelError instanceof Error ? channelError : new Error(String(channelError));
              loading = false;
              if (!resolved) {
                resolved = true;
                reject(error);
              }
              return;
            }

            loading = isLoading || false;

            if (channelsData) {
              // Converter os dados do SDK para o formato AmityChannel
              channels = channelsData.map((channel: any) => ({
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
            }

            hasNextPage = hasMore || false;

            // Resolver quando não estiver mais carregando e ainda não foi resolvido
            if (!loading && !resolved) {
              resolved = true;
              resolve({
                channels,
                hasNextPage,
                loading: false,
                error: null,
              });
            }
          }
        );

        // Timeout de segurança (10 segundos)
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve({
              channels,
              hasNextPage,
              loading: false,
              error: error || new Error('Timeout ao buscar channels'),
            });
          }
        }, 10000);
      });
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

