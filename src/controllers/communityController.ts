import { Response } from 'express';
import prisma from '@/config/database';
import { AuthenticatedRequest } from '@/types';
import { sendSuccess, sendError } from '@/utils/response';
import { socialPlusClient } from '@/utils/socialPlus';

/**
 * @swagger
 * /api/communities:
 *   get:
 *     summary: Listar todas as comunidades
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [public, private, official, unofficial]
 *     responses:
 *       200:
 *         description: Lista de comunidades obtida com sucesso
 */
export const listCommunities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const type = req.query.type as string | undefined;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (type) {
      where.type = type;
    }

    const [communities, total] = await Promise.all([
      prisma.community.findMany({
        where,
        skip,
        take: limit,
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              avatar: true,
              person: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          members: {
            where: { deletedAt: null },
            select: {
              id: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.community.count({ where }),
    ]);

    sendSuccess(
      res,
      {
        communities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      'Comunidades obtidas com sucesso'
    );
  } catch (error) {
    console.error('List communities error:', error);
    sendError(res, 'Erro ao listar comunidades');
  }
};

/**
 * @swagger
 * /api/communities/{id}:
 *   get:
 *     summary: Obter comunidade por ID
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comunidade obtida com sucesso
 *       404:
 *         description: Comunidade não encontrada
 */
export const getCommunityById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const community = await prisma.community.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            avatar: true,
            person: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        members: {
          where: { deletedAt: null },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                person: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!community || community.deletedAt) {
      sendError(res, 'Comunidade não encontrada', 404);
      return;
    }

    sendSuccess(res, community, 'Comunidade obtida com sucesso');
  } catch (error) {
    console.error('Get community error:', error);
    sendError(res, 'Erro ao obter comunidade');
  }
};

/**
 * @swagger
 * /api/communities/{id}/members:
 *   post:
 *     summary: Adicionar membro à comunidade
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [member, admin, moderator]
 *                 default: member
 *     responses:
 *       201:
 *         description: Membro adicionado com sucesso
 *       404:
 *         description: Comunidade ou usuário não encontrado
 */
export const addMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId, role = 'member' } = req.body;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      sendError(res, 'Usuário não autenticado', 401);
      return;
    }

    const community = await prisma.community.findUnique({
      where: { id },
      include: {
        members: {
          where: {
            userId: currentUserId,
            deletedAt: null,
          },
        },
      },
    });

    if (!community || community.deletedAt) {
      sendError(res, 'Comunidade não encontrada', 404);
      return;
    }

    // Verificar se o usuário atual tem permissão (admin ou criador)
    const isAdmin = community.members.some(
      (m) => m.userId === currentUserId && (m.role === 'admin' || m.role === 'moderator')
    );
    const isCreator = community.createdBy === currentUserId;

    if (!isAdmin && !isCreator) {
      sendError(res, 'Sem permissão para adicionar membros', 403);
      return;
    }

    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, socialPlusUserId: true },
    });

    if (!user) {
      sendError(res, 'Usuário não encontrado', 404);
      return;
    }

    // Verificar se já é membro
    const existingMember = await prisma.communityMember.findFirst({
      where: {
        userId,
        communityId: id,
        deletedAt: null,
      },
    });

    if (existingMember) {
      sendError(res, 'Usuário já é membro desta comunidade', 409);
      return;
    }

    // Adicionar na social.plus se tiver IDs
    if (community.socialPlusCommunityId && user.socialPlusUserId) {
      await socialPlusClient.addMemberToCommunity(community.socialPlusCommunityId, user.socialPlusUserId);
    }

    // Adicionar no banco local
    const member = await prisma.communityMember.create({
      data: {
        userId,
        communityId: id,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            person: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    sendSuccess(res, member, 'Membro adicionado com sucesso', 201);
  } catch (error) {
    console.error('Add member error:', error);
    sendError(res, 'Erro ao adicionar membro');
  }
};

/**
 * @swagger
 * /api/communities/{id}/members/{userId}:
 *   delete:
 *     summary: Remover membro da comunidade
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Membro removido com sucesso
 *       404:
 *         description: Comunidade ou membro não encontrado
 */
export const removeMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id, userId } = req.params;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      sendError(res, 'Usuário não autenticado', 401);
      return;
    }

    const community = await prisma.community.findUnique({
      where: { id },
      include: {
        members: {
          where: {
            userId: currentUserId,
            deletedAt: null,
          },
        },
      },
    });

    if (!community || community.deletedAt) {
      sendError(res, 'Comunidade não encontrada', 404);
      return;
    }

    // Verificar se o usuário atual tem permissão ou está removendo a si mesmo
    const isAdmin = community.members.some(
      (m) => m.userId === currentUserId && (m.role === 'admin' || m.role === 'moderator')
    );
    const isCreator = community.createdBy === currentUserId;
    const isSelf = currentUserId === userId;

    if (!isAdmin && !isCreator && !isSelf) {
      sendError(res, 'Sem permissão para remover membros', 403);
      return;
    }

    const member = await prisma.communityMember.findFirst({
      where: {
        userId,
        communityId: id,
        deletedAt: null,
      },
      include: {
        user: {
          select: { socialPlusUserId: true },
        },
      },
    });

    if (!member) {
      sendError(res, 'Membro não encontrado', 404);
      return;
    }

    // Remover da social.plus se tiver IDs
    if (community.socialPlusCommunityId && member.user.socialPlusUserId) {
      await socialPlusClient.removeMemberFromCommunity(
        community.socialPlusCommunityId,
        member.user.socialPlusUserId
      );
    }

    // Soft delete no banco local
    await prisma.communityMember.update({
      where: { id: member.id },
      data: { deletedAt: new Date() },
    });

    sendSuccess(res, null, 'Membro removido com sucesso');
  } catch (error) {
    console.error('Remove member error:', error);
    sendError(res, 'Erro ao remover membro');
  }
};

/**
 * @swagger
 * /api/communities/{id}/members:
 *   get:
 *     summary: Listar membros da comunidade
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Lista de membros obtida com sucesso
 */
export const listMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const community = await prisma.community.findUnique({
      where: { id },
    });

    if (!community || community.deletedAt) {
      sendError(res, 'Comunidade não encontrada', 404);
      return;
    }

    const [members, total] = await Promise.all([
      prisma.communityMember.findMany({
        where: {
          communityId: id,
          deletedAt: null,
        },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              person: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.communityMember.count({
        where: {
          communityId: id,
          deletedAt: null,
        },
      }),
    ]);

    sendSuccess(
      res,
      {
        members,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      'Membros obtidos com sucesso'
    );
  } catch (error) {
    console.error('List members error:', error);
    sendError(res, 'Erro ao listar membros');
  }
};

