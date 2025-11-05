import { Request, Response } from 'express';
import prisma from '@/config/database';
import { sendSuccess, sendError } from '@/utils/response';

export const createRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const roleData = req.body;

    const role = await prisma.role.create({
      data: roleData,
      include: {
        roleGroups: true,
      },
    });

    sendSuccess(res, role, 'Role criada com sucesso', 201);
  } catch (error) {
    console.error('Create role error:', error);
    sendError(res, 'Erro ao criar role');
  }
};

export const getRoleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        roleGroups: true,
      },
    });

    if (!role) {
      sendError(res, 'Role não encontrada', 404);
      return;
    }

    sendSuccess(res, role, 'Role obtida com sucesso');
  } catch (error) {
    console.error('Get role error:', error);
    sendError(res, 'Erro ao obter role');
  }
};

export const getAllRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        skip,
        take: limit,
        include: {
          roleGroups: true,
        },
        orderBy: { createdAt: 'desc' },
        where: {
          deletedAt: null,
        },
      }),
      prisma.role.count({
        where: {
          deletedAt: null,
        },
      }),
    ]);

    sendSuccess(res, {
      roles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Roles obtidas com sucesso');
  } catch (error) {
    console.error('Get all roles error:', error);
    sendError(res, 'Erro ao obter roles');
  }
};

export const updateRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const role = await prisma.role.update({
      where: { id },
      data: updateData,
      include: {
        roleGroups: true,
      },
    });

    sendSuccess(res, role, 'Role atualizada com sucesso');
  } catch (error) {
    console.error('Update role error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'Role não encontrada', 404);
      return;
    }
    sendError(res, 'Erro ao atualizar role');
  }
};

export const deleteRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.role.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    sendSuccess(res, null, 'Role deletada com sucesso');
  } catch (error) {
    console.error('Delete role error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'Role não encontrada', 404);
      return;
    }
    sendError(res, 'Erro ao deletar role');
  }
};

