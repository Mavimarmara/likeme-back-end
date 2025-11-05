import { Request, Response } from 'express';
import prisma from '@/config/database';
import { sendSuccess, sendError } from '@/utils/response';

export const createRoleGroupUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, roleGroupId } = req.body;

    const roleGroupUser = await prisma.roleGroupUser.create({
      data: {
        userId,
        roleGroupId,
      },
      include: {
        user: {
          include: {
            person: true,
          },
        },
        roleGroup: true,
      },
    });

    sendSuccess(res, roleGroupUser, 'RoleGroupUser criado com sucesso', 201);
  } catch (error) {
    console.error('Create role group user error:', error);
    sendError(res, 'Erro ao criar role group user');
  }
};

export const getRoleGroupUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, roleGroupId } = req.params;

    const roleGroupUser = await prisma.roleGroupUser.findFirst({
      where: {
        userId,
        roleGroupId,
        deletedAt: null,
      },
      include: {
        user: {
          include: {
            person: true,
          },
        },
        roleGroup: true,
      },
    });

    if (!roleGroupUser) {
      sendError(res, 'RoleGroupUser não encontrado', 404);
      return;
    }

    sendSuccess(res, roleGroupUser, 'RoleGroupUser obtido com sucesso');
  } catch (error) {
    console.error('Get role group user error:', error);
    sendError(res, 'Erro ao obter role group user');
  }
};

export const getAllRoleGroupUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const userId = req.query.userId as string;
    const roleGroupId = req.query.roleGroupId as string;

    const where: any = {
      deletedAt: null,
    };

    if (userId) {
      where.userId = userId;
    }
    if (roleGroupId) {
      where.roleGroupId = roleGroupId;
    }

    const [roleGroupUsers, total] = await Promise.all([
      prisma.roleGroupUser.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            include: {
              person: true,
            },
          },
          roleGroup: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.roleGroupUser.count({ where }),
    ]);

    sendSuccess(res, {
      roleGroupUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'RoleGroupUsers obtidos com sucesso');
  } catch (error) {
    console.error('Get all role group users error:', error);
    sendError(res, 'Erro ao obter role group users');
  }
};

export const deleteRoleGroupUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, roleGroupId } = req.params;

    const roleGroupUser = await prisma.roleGroupUser.findFirst({
      where: {
        userId,
        roleGroupId,
        deletedAt: null,
      },
    });

    if (!roleGroupUser) {
      sendError(res, 'RoleGroupUser não encontrado', 404);
      return;
    }

    await prisma.roleGroupUser.update({
      where: {
        userId_roleGroupId: {
          userId,
          roleGroupId,
        },
      },
      data: { deletedAt: new Date() },
    });

    sendSuccess(res, null, 'RoleGroupUser deletado com sucesso');
  } catch (error) {
    console.error('Delete role group user error:', error);
    sendError(res, 'Erro ao deletar role group user');
  }
};

