import { Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { AmityGlobalFeedResponse, AmityGlobalFeedData } from '@/types/amity';
import { sendError, sendSuccess } from '@/utils/response';
import { socialPlusClient } from '@/utils/socialPlus';
import { getUserAccessToken } from '@/utils/userToken';
import { normalizeAmityResponse, buildAmityFeedResponse } from '@/utils/amityResponseNormalizer';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const DEFAULT_MEMBER_ROLE = 'member';
const DEFAULT_SOCIAL_COMMUNITY_PAGE_LIMIT = 100;

const buildPaginationParams = (query: any) => {
  const page = parseInt(query.page as string, 10) || DEFAULT_PAGE;
  const limit = parseInt(query.limit as string, 10) || DEFAULT_LIMIT;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const buildPaginationResponse = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

const handleError = (res: Response, error: unknown, operation: string): void => {
  console.error(`${operation} error:`, error);
  sendError(res, `Erro ao ${operation}`);
};


const extractCommunitiesFromResponse = (data: any): any[] => {
  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.communities)) {
    return data.communities;
  }

  if (Array.isArray(data.items)) {
    return data.items;
  }

  return [];
};

const extractMembersFromResponse = (data: any): any[] => {
  if (!data) {
    return [];
  }

  if (Array.isArray(data.members)) {
    return data.members;
  }

  if (Array.isArray(data.items)) {
    return data.items;
  }

  return [];
};


const buildSocialPlusErrorMessage = (fallbackMessage: string, socialPlusError?: string) => {
  if (socialPlusError) {
    return `${fallbackMessage}: ${socialPlusError}`;
  }
  return fallbackMessage;
};




export const listCommunities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, sortBy, includeDeleted } = req.query;

    // Tentar obter token de autenticação do usuário se estiver autenticado
    const { token: userAccessToken } = await getUserAccessToken(req, false);

    const response = await socialPlusClient.listCommunities({
      userAccessToken: userAccessToken || undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      sortBy: sortBy as string | undefined,
      includeDeleted: includeDeleted === 'true' ? true : undefined,
    });

    if (!response.success) {
      sendError(res, buildSocialPlusErrorMessage('Erro ao listar comunidades', response.error));
      return;
    }

    // A resposta v3 tem uma estrutura diferente com communities, communityUsers, files, users, etc.
    const data = response.data ?? {};
    const communities = data.communities ?? [];
    const paging = data.paging ?? {};

    sendSuccess(
      res,
      {
        ...data,
        communities,
        pagination: {
          page: page ? parseInt(page as string, 10) : DEFAULT_PAGE,
          limit: limit ? parseInt(limit as string, 10) : DEFAULT_LIMIT,
          total: communities.length,
          next: paging.next,
          previous: paging.previous,
        },
      },
      'Comunidades obtidas com sucesso'
    );
  } catch (error) {
    handleError(res, error, 'listar comunidades v3');
  }
};

export const getMyPosts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, sortBy, includeDeleted, targetType, targetId } = req.query;

    // O endpoint v3/posts/list requer token de usuário autenticado (obrigatório)
    const { token: userAccessToken, error: tokenError } = await getUserAccessToken(req, true);

    if (tokenError || !userAccessToken) {
      const statusCode = tokenError?.includes('não autenticado') ? 401 : tokenError?.includes('não está sincronizado') ? 400 : 500;
      sendError(res, tokenError || 'Erro ao obter token de autenticação', statusCode);
      return;
    }

    // O endpoint v3/content-feeds requer token de usuário
    const response = await socialPlusClient.getContentFeed({
      userAccessToken: userAccessToken,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      sortBy: sortBy as string | undefined,
      includeDeleted: includeDeleted === 'true',
      targetType: targetType as string | undefined,
      targetId: targetId as string | undefined,
    });

    if (!response.success) {
      sendError(res, buildSocialPlusErrorMessage('Erro ao obter feed de conteúdo', response.error));
      return;
    }

    // A resposta v3/content-feeds tem estrutura: { status, data: { posts, postChildren, comments, users, files, communities, categories, videoStreamings, polls, paging } }
    // O makeRequest preserva o status e mescla com o data interno
    const data = response.data ?? {};
    const posts = data.posts ?? [];
    const paging = data.paging ?? {};
    
    // Log do conteúdo dos posts
    console.log('[Community] response.data.posts:', JSON.stringify(posts, null, 2));
    console.log(`[Community] Total de posts: ${posts.length}`);

    // Retornar estrutura completa conforme documentação da API v3
    sendSuccess(
      res,
      {
        status: data.status || 'ok',
        data: {
          posts: data.posts ?? [],
          postChildren: data.postChildren ?? [],
          comments: data.comments ?? [],
          users: data.users ?? [],
          files: data.files ?? [],
          communities: data.communities ?? [],
          communityUsers: data.communityUsers ?? [],
          categories: data.categories ?? [],
          feeds: data.feeds ?? [],
          videoStreamings: data.videoStreamings ?? [],
          videoStreamingChildren: data.videoStreamingChildren ?? [],
          polls: data.polls ?? [],
          paging: {
            next: paging.next,
            previous: paging.previous,
          },
        },
        // Manter compatibilidade com formato anterior
        pagination: buildPaginationResponse(
          page ? parseInt(page as string, 10) : DEFAULT_PAGE,
          limit ? parseInt(limit as string, 10) : DEFAULT_LIMIT,
          posts.length
        ),
      },
      'Feed de conteúdo obtido com sucesso'
    );
  } catch (error) {
    handleError(res, error, 'listar posts do usuário');
  }
};

export const getPublicCommunityPosts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page, limit } = buildPaginationParams(req.query);

    // Tentar obter token de autenticação do usuário se estiver autenticado
    const { token: userAccessToken } = await getUserAccessToken(req, false);

    // Usar token de usuário se disponível, caso contrário usar autenticação padrão (server token ou API key)
    const response = await socialPlusClient.getGlobalFeed({
      page,
      limit,
      userAccessToken: userAccessToken || undefined,
    });

    if (!response.success) {
      sendError(res, buildSocialPlusErrorMessage('Erro ao listar posts públicos', response.error));
      return;
    }

    // A resposta v5/me/global-feeds tem estrutura: { status, data: { posts, postChildren, comments, users, files, communities, communityUsers, categories, paging } }
    // O makeRequest já extrai o data interno, então response.data já contém o objeto data da API
    const apiResponse = response.data as AmityGlobalFeedResponse | AmityGlobalFeedData | undefined;
    
    // Log do conteúdo dos posts antes da normalização
    if (apiResponse) {
      const postsBeforeNormalize = ('data' in apiResponse && apiResponse.data?.posts) || ('posts' in apiResponse ? apiResponse.posts : undefined);
      console.log('[Community] response.data.posts (getPublicCommunityPosts):', JSON.stringify(postsBeforeNormalize, null, 2));
      console.log(`[Community] Total de posts (getPublicCommunityPosts): ${postsBeforeNormalize?.length || 0}`);
    }
    
    // Normalizar a resposta usando função utilitária
    const { feedData, status } = normalizeAmityResponse(apiResponse);
    
    // Log do conteúdo dos posts após normalização
    console.log('[Community] feedData.posts (após normalização):', JSON.stringify(feedData.posts, null, 2));
    console.log(`[Community] Total de posts (após normalização): ${feedData.posts?.length || 0}`);
    
    // Construir resposta completa usando função utilitária
    const responseData = buildAmityFeedResponse(feedData, status, page, limit);
    
    sendSuccess(res, responseData, 'Posts globais obtidos com sucesso');
  } catch (error) {
    handleError(res, error, 'listar posts globais');
  }
};
