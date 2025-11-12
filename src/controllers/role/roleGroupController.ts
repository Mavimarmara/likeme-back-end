import { Request, Response } from 'express';
import prisma from '@/config/database';
import { sendSuccess, sendError } from '@/utils/response';

export const createRoleGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const roleGroupData = req.body;

    const roleGroup = await prisma.roleGroup.create({
      data: roleGroupData,
      include: {
        roles: true,
        users: true,
      },
    });

    sendSuccess(res, roleGroup, 'RoleGroup criado com sucesso', 201);
  } catch (error) {
    console.error('Create role group error:', error);
    sendError(res, 'Erro ao criar role group');
  }
};

export const getRoleGroupById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const roleGroup = await prisma.roleGroup.findUnique({
      where: { id },
      include: {
        roles: true,
        users: true,
      },
    });

    if (!roleGroup) {
      sendError(res, 'RoleGroup não encontrado', 404);
      return;
    }

    sendSuccess(res, roleGroup, 'RoleGroup obtido com sucesso');
  } catch (error) {
    console.error('Get role group error:', error);
    sendError(res, 'Erro ao obter role group');
  }
};

export const getAllRoleGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [roleGroups, total] = await Promise.all([
      prisma.roleGroup.findMany({
        skip,
        take: limit,
        include: {
          roles: true,
          users: true,
        },
        orderBy: { createdAt: 'desc' },
        where: {
          deletedAt: null,
        },
      }),
      prisma.roleGroup.count({
        where: {
          deletedAt: null,
        },
      }),
    ]);

    sendSuccess(res, {
      roleGroups,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'RoleGroups obtidos com sucesso');
  } catch (error) {
    console.error('Get all role groups error:', error);
    sendError(res, 'Erro ao obter role groups');
  }
};

export const updateRoleGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const roleGroup = await prisma.roleGroup.update({
      where: { id },
      data: updateData,
      include: {
        roles: true,
        users: true,
      },
    });

    sendSuccess(res, roleGroup, 'RoleGroup atualizado com sucesso');
  } catch (error) {
    console.error('Update role group error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'RoleGroup não encontrado', 404);
      return;
    }
    sendError(res, 'Erro ao atualizar role group');
  }
};

export const deleteRoleGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.roleGroup.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    sendSuccess(res, null, 'RoleGroup deletado com sucesso');
  } catch (error) {
    console.error('Delete role group error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'RoleGroup não encontrado', 404);
      return;
    }
    sendError(res, 'Erro ao deletar role group');
  }
};

