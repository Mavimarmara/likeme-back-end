import { Response } from 'express';
import prisma from '@/config/database';
import { AuthenticatedRequest } from '@/types';
import { sendError, sendSuccess } from '@/utils/response';
import { socialPlusClient } from '@/utils/socialPlus';

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

interface FetchCommunityPostsOptions {
  perCommunityPage?: number;
  perCommunityLimit?: number;
}

const fetchPostsFromCommunities = async (
  communityIds: string[],
  options?: FetchCommunityPostsOptions
): Promise<any[]> => {
  const perCommunityPage = options?.perCommunityPage ?? DEFAULT_PAGE;
  const perCommunityLimit = options?.perCommunityLimit ?? DEFAULT_SOCIAL_COMMUNITY_PAGE_LIMIT;

  const postsPromises = communityIds.map(async (communityId) => {
    try {
      const response = await socialPlusClient.getCommunityPosts(communityId, {
        page: perCommunityPage,
        limit: perCommunityLimit,
      });

      if (response.success && response.data?.posts) {
        return response.data.posts.map((post: any) => ({
          ...post,
          communityId,
        }));
      }

      return [];
    } catch (error) {
      console.error(`Erro ao buscar posts da comunidade ${communityId}:`, error);
      return [];
    }
  });

  const postsArrays = await Promise.all(postsPromises);
  return postsArrays.flat();
};

const sortPostsByDate = (posts: any[]): any[] => {
  return posts.sort((a, b) => {
    const getPostDate = (post: any): number => {
      const dateStr = post.createdAt || post.created_at || post.date || post.timestamp;
      if (!dateStr) return 0;
      const date = new Date(dateStr);
      return date.getTime() || 0;
    };

    const dateA = getPostDate(a);
    const dateB = getPostDate(b);

    return dateB - dateA;
  });
};

const getUserCommunitiesFromSocialPlus = async (
  socialPlusUserId: string,
  page = DEFAULT_PAGE,
  limit = DEFAULT_SOCIAL_COMMUNITY_PAGE_LIMIT
) => {
  return socialPlusClient.getUserCommunities(socialPlusUserId, {
    page,
    limit,
  });
};

const mapUserCommunities = (communities: any[]) => {
  return communities.map((item) => {
    if (item?.community) {
      return {
        ...item.community,
        role: item.role || item.communityRole || item.membershipRole || item.membership?.role,
        joinedAt: item.joinedAt || item.createdAt || item.membership?.createdAt,
      };
    }

    return {
      ...item,
      role: item.role,
      joinedAt: item.joinedAt || item.createdAt,
    };
  });
};

const buildSocialPlusErrorMessage = (fallbackMessage: string, socialPlusError?: string) => {
  if (socialPlusError) {
    return `${fallbackMessage}: ${socialPlusError}`;
  }
  return fallbackMessage;
};

export const listCommunities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page, limit } = buildPaginationParams(req.query);
    const type = req.query.type as string | undefined;

    const response = await socialPlusClient.listCommunities({
      page,
      limit,
      type,
    });

    if (!response.success) {
      sendError(res, buildSocialPlusErrorMessage('Erro ao listar comunidades', response.error));
      return;
    }

    const communities = extractCommunitiesFromResponse(response.data);
    const total = response.data?.total ?? communities.length;

    sendSuccess(
      res,
      {
        communities,
        pagination: buildPaginationResponse(page, limit, total),
      },
      'Comunidades obtidas com sucesso'
    );
  } catch (error) {
    handleError(res, error, 'listar comunidades');
  }
};

export const getCommunityById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const response = await socialPlusClient.getCommunity(id);

    if (!response.success || !response.data) {
      sendError(res, buildSocialPlusErrorMessage('Comunidade não encontrada', response.error), 404);
      return;
    }

    sendSuccess(res, response.data, 'Comunidade obtida com sucesso');
  } catch (error) {
    handleError(res, error, 'obter comunidade');
  }
};

export const addMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id: communityId } = req.params;
    const { userId, socialPlusUserId, role = DEFAULT_MEMBER_ROLE } = req.body;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      sendError(res, 'Usuário não autenticado', 401);
      return;
    }

    const currentUserSocialId = await getSocialPlusUserIdFromDb(currentUserId);

    if (!currentUserSocialId) {
      sendError(res, 'Usuário autenticado não está sincronizado com a social.plus', 400);
      return;
    }

    let targetSocialPlusUserId = socialPlusUserId;

    if (!targetSocialPlusUserId) {
      if (!userId) {
        sendError(res, 'Informe o userId interno ou o socialPlusUserId a ser adicionado', 400);
      return;
    }

      targetSocialPlusUserId = await getSocialPlusUserIdFromDb(userId);
    }

    if (!targetSocialPlusUserId) {
      sendError(res, 'Usuário não encontrado ou não sincronizado com a social.plus', 404);
      return;
    }

    const response = await socialPlusClient.addMemberToCommunity(communityId, targetSocialPlusUserId);

    if (!response.success) {
      sendError(res, buildSocialPlusErrorMessage('Erro ao adicionar membro', response.error));
      return;
    }

    sendSuccess(
      res,
      {
        communityId,
        userSocialPlusId: targetSocialPlusUserId,
        addedBy: currentUserSocialId,
        role,
      },
      'Membro adicionado com sucesso',
      201
    );
  } catch (error) {
    handleError(res, error, 'adicionar membro');
  }
};

export const removeMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id: communityId, userId } = req.params;
    const { socialPlusUserId } = req.query;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      sendError(res, 'Usuário não autenticado', 401);
      return;
    }

    const currentUserSocialId = await getSocialPlusUserIdFromDb(currentUserId);

    if (!currentUserSocialId) {
      sendError(res, 'Usuário autenticado não está sincronizado com a social.plus', 400);
      return;
    }

    let targetSocialPlusUserId: string | null = typeof socialPlusUserId === 'string' ? socialPlusUserId : null;

    if (!targetSocialPlusUserId) {
      targetSocialPlusUserId = userId ? await getSocialPlusUserIdFromDb(userId) : null;
    }

    if (!targetSocialPlusUserId) {
      sendError(res, 'Usuário não encontrado ou não sincronizado com a social.plus', 404);
      return;
    }

    const response = await socialPlusClient.removeMemberFromCommunity(communityId, targetSocialPlusUserId);

    if (!response.success) {
      sendError(res, buildSocialPlusErrorMessage('Erro ao remover membro', response.error));
      return;
    }

    sendSuccess(
      res,
      {
        communityId,
        userSocialPlusId: targetSocialPlusUserId,
        removedBy: currentUserSocialId,
      },
      'Membro removido com sucesso'
    );
  } catch (error) {
    handleError(res, error, 'remover membro');
  }
};

export const listMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id: communityId } = req.params;
    const { page, limit } = buildPaginationParams(req.query);

    const response = await socialPlusClient.getCommunityMembers(communityId, {
      page,
      limit,
    });

    if (!response.success) {
      sendError(res, buildSocialPlusErrorMessage('Erro ao listar membros', response.error));
      return;
    }

    const members = extractMembersFromResponse(response.data);
    const total = response.data?.total ?? members.length;

    sendSuccess(
      res,
      {
        members,
        pagination: buildPaginationResponse(page, limit, total),
      },
      'Membros obtidos com sucesso'
    );
  } catch (error) {
    handleError(res, error, 'listar membros');
  }
};

export const getUserCommunities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      sendError(res, 'Usuário não autenticado', 401);
      return;
    }

    const socialPlusUserId = await getSocialPlusUserIdFromDb(currentUserId);

    if (!socialPlusUserId) {
      sendError(res, 'Usuário não está sincronizado com a social.plus', 400);
      return;
    }

    const { page, limit } = buildPaginationParams(req.query);
    const response = await getUserCommunitiesFromSocialPlus(socialPlusUserId, page, limit);

    if (!response.success) {
      sendError(res, buildSocialPlusErrorMessage('Erro ao listar comunidades do usuário', response.error));
      return;
    }

    const memberships = mapUserCommunities(extractCommunitiesFromResponse(response.data));
    const total = response.data?.total ?? memberships.length;

    sendSuccess(
      res,
      {
        communities: memberships,
        pagination: buildPaginationResponse(page, limit, total),
      },
      'Comunidades do usuário obtidas com sucesso'
    );
  } catch (error) {
    handleError(res, error, 'listar comunidades do usuário');
  }
};

export const getUserCommunityPosts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      sendError(res, 'Usuário não autenticado', 401);
      return;
    }

    const socialPlusUserId = await getSocialPlusUserIdFromDb(currentUserId);

    if (!socialPlusUserId) {
      sendError(res, 'Usuário não está sincronizado com a social.plus', 400);
      return;
    }

    const { page, limit, skip } = buildPaginationParams(req.query);

    const response = await getUserCommunitiesFromSocialPlus(
      socialPlusUserId,
      DEFAULT_PAGE,
      DEFAULT_SOCIAL_COMMUNITY_PAGE_LIMIT
    );

    if (!response.success) {
      sendError(res, buildSocialPlusErrorMessage('Erro ao listar comunidades do usuário', response.error));
      return;
    }

    const memberships = extractCommunitiesFromResponse(response.data);
    const communityIds = memberships
      .map((membership: any) => membership?.community?.id || membership?.id)
      .filter((value): value is string => Boolean(value));

    if (communityIds.length === 0) {
      sendSuccess(
        res,
        {
          posts: [],
          pagination: buildPaginationResponse(page, limit, 0),
        },
        'Nenhum post encontrado'
      );
      return;
    }

    const allPosts = await fetchPostsFromCommunities(communityIds);
    const sortedPosts = sortPostsByDate(allPosts);
    const total = sortedPosts.length;
    const paginatedPosts = sortedPosts.slice(skip, skip + limit);

    sendSuccess(
      res,
      {
        posts: paginatedPosts,
        pagination: buildPaginationResponse(page, limit, total),
      },
      'Posts das comunidades obtidos com sucesso'
    );
  } catch (error) {
    handleError(res, error, 'listar posts das comunidades');
  }
};

export const getPublicCommunityPosts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page, limit } = buildPaginationParams(req.query);

    const response = await socialPlusClient.getGlobalFeed({
      page,
      limit,
    });

    if (!response.success) {
      sendError(res, buildSocialPlusErrorMessage('Erro ao listar posts públicos', response.error));
      return;
    }

    const feedData = response.data ?? {};
    const posts = feedData.posts ?? [];
    const total = feedData.paging?.total ?? posts.length ?? 0;

    sendSuccess(
      res,
      {
        ...feedData,
        posts,
        pagination: buildPaginationResponse(page, limit, total),
      },
      'Posts globais obtidos com sucesso'
    );
  } catch (error) {
    handleError(res, error, 'listar posts globais');
  }
};
