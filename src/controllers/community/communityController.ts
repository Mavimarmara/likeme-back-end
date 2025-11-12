import { Response } from 'express';
import prisma from '@/config/database';
import { AuthenticatedRequest } from '@/types';
import { sendSuccess, sendError } from '@/utils/response';
import { socialPlusClient } from '@/utils/socialPlus';

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const DEFAULT_MEMBER_ROLE = 'member';
const ADMIN_ROLES = ['admin', 'moderator'] as const;

const CREATOR_SELECT = {
  id: true,
  username: true,
  avatar: true,
  person: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
};

const USER_SELECT = {
  id: true,
  username: true,
  avatar: true,
  person: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
};

// ============================================
// QUERY HELPERS
// ============================================

const buildCommunityWhereClause = (type?: string) => ({
  deletedAt: null,
  ...(type && { type }),
});

const buildPaginationParams = (query: any) => {
  const page = parseInt(query.page as string) || DEFAULT_PAGE;
  const limit = parseInt(query.limit as string) || DEFAULT_LIMIT;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const findCommunityById = async (id: string) => {
  return prisma.community.findUnique({
    where: { id },
    include: {
      creator: { select: CREATOR_SELECT },
      members: {
        where: { deletedAt: null },
        include: { user: { select: USER_SELECT } },
      },
    },
  });
};

const findCommunityWithCurrentUserMembership = async (communityId: string, userId: string) => {
  return prisma.community.findUnique({
    where: { id: communityId },
    include: {
      members: {
        where: {
          userId,
          deletedAt: null,
        },
      },
    },
  });
};

const findUserById = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, socialPlusUserId: true },
  });
};

const findExistingMember = async (userId: string, communityId: string) => {
  return prisma.communityMember.findFirst({
    where: {
      userId,
      communityId,
      deletedAt: null,
    },
  });
};

const findMemberWithUser = async (userId: string, communityId: string) => {
  return prisma.communityMember.findFirst({
    where: {
      userId,
      communityId,
      deletedAt: null,
    },
    include: {
      user: {
        select: { socialPlusUserId: true },
      },
    },
  });
};

const listCommunitiesQuery = async (where: any, skip: number, limit: number) => {
  return prisma.community.findMany({
    where,
    skip,
    take: limit,
    include: {
      creator: { select: CREATOR_SELECT },
      members: {
        where: { deletedAt: null },
        select: { id: true, role: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

const listMembersQuery = async (communityId: string, skip: number, limit: number) => {
  const where = {
    communityId,
    deletedAt: null,
  };

  return Promise.all([
    prisma.communityMember.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: { select: USER_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.communityMember.count({ where }),
  ]);
};

const listUserCommunitiesQuery = async (userId: string, skip: number, limit: number) => {
  const where = {
    userId,
    deletedAt: null,
    community: {
      deletedAt: null,
    },
  };

  return Promise.all([
    prisma.communityMember.findMany({
      where,
      skip,
      take: limit,
      include: {
        community: {
          include: {
            creator: { select: CREATOR_SELECT },
            members: {
              where: { deletedAt: null },
              select: {
                id: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.communityMember.count({ where }),
  ]);
};

const createMember = async (userId: string, communityId: string, role: string) => {
  return prisma.communityMember.create({
    data: {
      userId,
      communityId,
      role,
    },
    include: {
      user: { select: USER_SELECT },
    },
  });
};

const softDeleteMember = async (memberId: string) => {
  return prisma.communityMember.update({
    where: { id: memberId },
    data: { deletedAt: new Date() },
  });
};

// ============================================
// VALIDATION HELPERS
// ============================================

const validateAuthenticatedUser = (userId: string | undefined): boolean => {
  return userId !== undefined;
};

const validateCommunityExists = (community: any): boolean => {
  return community !== null && community.deletedAt === null;
};

const validateUserExists = (user: any): boolean => {
  return user !== null;
};

const validateMemberNotExists = (member: any): boolean => {
  return member === null;
};

// ============================================
// PERMISSION HELPERS
// ============================================

const hasAdminRole = (members: any[], userId: string): boolean => {
  return members.some(
    (member) => member.userId === userId && ADMIN_ROLES.includes(member.role as any)
  );
};

const isCommunityCreator = (community: any, userId: string): boolean => {
  return community.createdBy === userId;
};

const canAddMembers = (community: any, userId: string): boolean => {
  const isAdmin = hasAdminRole(community.members, userId);
  const isCreator = isCommunityCreator(community, userId);
  return isAdmin || isCreator;
};

const canRemoveMembers = (community: any, currentUserId: string, targetUserId: string): boolean => {
  const isAdmin = hasAdminRole(community.members, currentUserId);
  const isCreator = isCommunityCreator(community, currentUserId);
  const isSelf = currentUserId === targetUserId;
  return isAdmin || isCreator || isSelf;
};

// ============================================
// SOCIAL.PLUS SYNC HELPERS
// ============================================

const syncMemberToSocialPlus = async (
  socialPlusCommunityId: string | null,
  socialPlusUserId: string | null
): Promise<void> => {
  if (!socialPlusCommunityId || !socialPlusUserId) {
    return;
  }

  await socialPlusClient.addMemberToCommunity(socialPlusCommunityId, socialPlusUserId);
};

const removeMemberFromSocialPlus = async (
  socialPlusCommunityId: string | null,
  socialPlusUserId: string | null
): Promise<void> => {
  if (!socialPlusCommunityId || !socialPlusUserId) {
    return;
  }

  await socialPlusClient.removeMemberFromCommunity(socialPlusCommunityId, socialPlusUserId);
};

// ============================================
// RESPONSE HELPERS
// ============================================

const buildPaginationResponse = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

const handleError = (res: Response, error: any, operation: string): void => {
  console.error(`${operation} error:`, error);
  sendError(res, `Erro ao ${operation}`);
};

// ============================================
// CONTROLLERS
// ============================================

export const listCommunities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = buildPaginationParams(req.query);
    const where = buildCommunityWhereClause(req.query.type as string | undefined);

    const [communities, total] = await Promise.all([
      listCommunitiesQuery(where, skip, limit),
      prisma.community.count({ where }),
    ]);

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
    const community = await findCommunityById(id);

    if (!validateCommunityExists(community)) {
      sendError(res, 'Comunidade não encontrada', 404);
      return;
    }

    sendSuccess(res, community, 'Comunidade obtida com sucesso');
  } catch (error) {
    handleError(res, error, 'obter comunidade');
  }
};

export const addMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id: communityId } = req.params;
    const { userId, role = DEFAULT_MEMBER_ROLE } = req.body;
    const currentUserId = req.user?.id;

    if (!validateAuthenticatedUser(currentUserId)) {
      sendError(res, 'Usuário não autenticado', 401);
      return;
    }

    const community = await findCommunityWithCurrentUserMembership(communityId, currentUserId!);

    if (!validateCommunityExists(community)) {
      sendError(res, 'Comunidade não encontrada', 404);
      return;
    }

    if (!canAddMembers(community, currentUserId!)) {
      sendError(res, 'Sem permissão para adicionar membros', 403);
      return;
    }

    const user = await findUserById(userId);

    if (!validateUserExists(user)) {
      sendError(res, 'Usuário não encontrado', 404);
      return;
    }

    const existingMember = await findExistingMember(userId, communityId);

    if (!validateMemberNotExists(existingMember)) {
      sendError(res, 'Usuário já é membro desta comunidade', 409);
      return;
    }

    if (!community || !user) {
      sendError(res, 'Erro interno', 500);
      return;
    }

    await syncMemberToSocialPlus(community.socialPlusCommunityId, user.socialPlusUserId);

    const member = await createMember(userId, communityId, role);

    sendSuccess(res, member, 'Membro adicionado com sucesso', 201);
  } catch (error) {
    handleError(res, error, 'adicionar membro');
  }
};

export const removeMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id: communityId, userId } = req.params;
    const currentUserId = req.user?.id;

    if (!validateAuthenticatedUser(currentUserId)) {
      sendError(res, 'Usuário não autenticado', 401);
      return;
    }

    const community = await findCommunityWithCurrentUserMembership(communityId, currentUserId!);

    if (!validateCommunityExists(community)) {
      sendError(res, 'Comunidade não encontrada', 404);
      return;
    }

    if (!canRemoveMembers(community, currentUserId!, userId)) {
      sendError(res, 'Sem permissão para remover membros', 403);
      return;
    }

    const member = await findMemberWithUser(userId, communityId);

    if (!validateUserExists(member)) {
      sendError(res, 'Membro não encontrado', 404);
      return;
    }

    if (!community || !member) {
      sendError(res, 'Erro interno', 500);
      return;
    }

    await removeMemberFromSocialPlus(
      community.socialPlusCommunityId,
      member.user.socialPlusUserId
    );

    await softDeleteMember(member.id);

    sendSuccess(res, null, 'Membro removido com sucesso');
  } catch (error) {
    handleError(res, error, 'remover membro');
  }
};

export const listMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id: communityId } = req.params;
    const { page, limit, skip } = buildPaginationParams(req.query);

    const community = await prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!validateCommunityExists(community)) {
      sendError(res, 'Comunidade não encontrada', 404);
      return;
    }

    const [members, total] = await listMembersQuery(communityId, skip, limit);

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

    if (!validateAuthenticatedUser(currentUserId)) {
      sendError(res, 'Usuário não autenticado', 401);
      return;
    }

    const { page, limit, skip } = buildPaginationParams(req.query);
    const [memberships, total] = await listUserCommunitiesQuery(currentUserId!, skip, limit);

    const communities = memberships.map((membership) => ({
      ...membership.community,
      role: membership.role,
      joinedAt: membership.createdAt,
    }));

    sendSuccess(
      res,
      {
        communities,
        pagination: buildPaginationResponse(page, limit, total),
      },
      'Comunidades do usuário obtidas com sucesso'
    );
  } catch (error) {
    handleError(res, error, 'listar comunidades do usuário');
  }
};
