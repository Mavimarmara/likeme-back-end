import { Request, Response } from 'express';
import prisma from '@/config/database';
import { sendSuccess, sendError } from '@/utils/response';

export const createRoleGroupRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roleGroupId, roleId } = req.body;

    const roleGroupRole = await prisma.roleGroupRole.create({
      data: {
        roleGroupId,
        roleId,
      },
      include: {
        roleGroup: true,
        role: true,
      },
    });

    sendSuccess(res, roleGroupRole, 'RoleGroupRole criado com sucesso', 201);
  } catch (error) {
    console.error('Create role group role error:', error);
    sendError(res, 'Erro ao criar role group role');
  }
};

export const getRoleGroupRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roleGroupId, roleId } = req.params;

    const roleGroupRole = await prisma.roleGroupRole.findFirst({
      where: {
        roleGroupId,
        roleId,
        deletedAt: null,
      },
      include: {
        roleGroup: true,
        role: true,
      },
    });

    if (!roleGroupRole) {
      sendError(res, 'RoleGroupRole não encontrado', 404);
      return;
    }

    sendSuccess(res, roleGroupRole, 'RoleGroupRole obtido com sucesso');
  } catch (error) {
    console.error('Get role group role error:', error);
    sendError(res, 'Erro ao obter role group role');
  }
};

export const getAllRoleGroupRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const roleGroupId = req.query.roleGroupId as string;
    const roleId = req.query.roleId as string;

    const where: any = {
      deletedAt: null,
    };

    if (roleGroupId) {
      where.roleGroupId = roleGroupId;
    }
    if (roleId) {
      where.roleId = roleId;
    }

    const [roleGroupRoles, total] = await Promise.all([
      prisma.roleGroupRole.findMany({
        where,
        skip,
        take: limit,
        include: {
          roleGroup: true,
          role: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.roleGroupRole.count({ where }),
    ]);

    sendSuccess(res, {
      roleGroupRoles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'RoleGroupRoles obtidos com sucesso');
  } catch (error) {
    console.error('Get all role group roles error:', error);
    sendError(res, 'Erro ao obter role group roles');
  }
};

export const deleteRoleGroupRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roleGroupId, roleId } = req.params;

    const roleGroupRole = await prisma.roleGroupRole.findFirst({
      where: {
        roleGroupId,
        roleId,
        deletedAt: null,
      },
    });

    if (!roleGroupRole) {
      sendError(res, 'RoleGroupRole não encontrado', 404);
      return;
    }

    await prisma.roleGroupRole.update({
      where: {
        roleGroupId_roleId: {
          roleGroupId,
          roleId,
        },
      },
      data: { deletedAt: new Date() },
    });

    sendSuccess(res, null, 'RoleGroupRole deletado com sucesso');
  } catch (error) {
    console.error('Delete role group role error:', error);
    sendError(res, 'Erro ao deletar role group role');
  }
};

