import { Response } from 'express';
import prisma from '@/config/database';
import { AuthenticatedRequest } from '@/types';
import { sendError, sendSuccess } from '@/utils/response';
import { socialPlusClient } from '@/utils/socialPlus';
import { createUserAccessToken } from '@/utils/amityClient';

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

const getSocialPlusUserIdFromDb = async (userId: string): Promise<string | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { socialPlusUserId: true },
  });

  return user?.socialPlusUserId ?? null;
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
    let userAccessToken: string | null = null;
    const currentUserId = req.user?.id;

    if (currentUserId) {
      try {
        const socialPlusUserId = await getSocialPlusUserIdFromDb(currentUserId);
        if (socialPlusUserId) {
          userAccessToken = await createUserAccessToken(socialPlusUserId);
          if (userAccessToken) {
            console.log(`[Community] Usando token de autenticação do usuário ${currentUserId} para listCommunities`);
          }
        }
      } catch (error) {
        console.warn('Erro ao obter token de autenticação do usuário, usando autenticação padrão:', error);
      }
    }

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

export const getPublicCommunityPosts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page, limit } = buildPaginationParams(req.query);

    // Tentar obter token de autenticação do usuário se estiver autenticado
    let userAccessToken: string | null = null;
    const currentUserId = req.user?.id;

    if (currentUserId) {
      try {
        const socialPlusUserId = await getSocialPlusUserIdFromDb(currentUserId);
        if (socialPlusUserId) {
          userAccessToken = await createUserAccessToken(socialPlusUserId);
          if (userAccessToken) {
            console.log(`[Community] Usando token de autenticação do usuário ${currentUserId} para getPublicCommunityPosts`);
          }
        }
      } catch (error) {
        console.warn('Erro ao obter token de autenticação do usuário, usando autenticação padrão:', error);
      }
    }

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

    // A resposta v3 tem estrutura: { status, data: { posts, postChildren, comments, users, files, communities, communityUsers, categories, paging } }
    // O makeRequest já extrai o data interno, então response.data já contém o objeto data da API
    const data = response.data ?? {};
    const posts = data.posts ?? [];
    const paging = data.paging ?? {};

    // Retornar estrutura completa conforme documentação da API v3
    sendSuccess(
      res,
      {
        status: 'ok',
        data: {
          posts: data.posts ?? [],
          postChildren: data.postChildren ?? [],
          comments: data.comments ?? [],
          users: data.users ?? [],
          files: data.files ?? [],
          communities: data.communities ?? [],
          communityUsers: data.communityUsers ?? [],
          categories: data.categories ?? [],
          paging: {
            next: paging.next,
            previous: paging.previous,
          },
        },
        // Manter compatibilidade com formato anterior
        pagination: buildPaginationResponse(page, limit, posts.length),
      },
      'Posts globais obtidos com sucesso'
    );
  } catch (error) {
    handleError(res, error, 'listar posts globais');
  }
};
