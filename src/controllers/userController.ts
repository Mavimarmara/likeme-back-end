import { Request, Response } from 'express';
import prisma from '@/config/database';
import { sendSuccess, sendError } from '@/utils/response';

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userData = req.body;

    const person = await prisma.person.findUnique({
      where: { id: userData.personId },
    });

    if (!person) {
      sendError(res, 'Pessoa não encontrada', 404);
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { personId: userData.personId },
    });

    if (existingUser) {
      sendError(res, 'Usuário já existe para esta pessoa', 409);
      return;
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username: userData.username },
    });

    if (existingUsername) {
      sendError(res, 'Username já está em uso', 409);
      return;
    }

    const user = await prisma.user.create({
      data: {
        personId: userData.personId,
        username: userData.username,
        password: userData.password,
        salt: userData.salt,
        avatar: userData.avatar,
        isActive: userData.isActive !== undefined ? userData.isActive : true,
      },
      include: {
        person: {
          include: {
            contacts: true,
          },
        },
        roleGroups: true,
      },
    });

    sendSuccess(res, user, 'Usuário criado com sucesso', 201);
  } catch (error) {
    console.error('Create user error:', error);
    sendError(res, 'Erro ao criar usuário');
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        person: {
          include: {
            contacts: true,
          },
        },
        roleGroups: true,
      },
    });

    if (!user) {
      sendError(res, 'Usuário não encontrado', 404);
      return;
    }

    sendSuccess(res, user, 'Usuário obtido com sucesso');
  } catch (error) {
    console.error('Get user error:', error);
    sendError(res, 'Erro ao obter usuário');
  }
};

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        include: {
          person: {
            include: {
              contacts: true,
            },
          },
          roleGroups: true,
        },
        orderBy: { createdAt: 'desc' },
        where: {
          deletedAt: null,
        },
      }),
      prisma.user.count({
        where: {
          deletedAt: null,
        },
      }),
    ]);

    sendSuccess(res, {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Usuários obtidos com sucesso');
  } catch (error) {
    console.error('Get all users error:', error);
    sendError(res, 'Erro ao obter usuários');
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        person: {
          include: {
            contacts: true,
          },
        },
        roleGroups: true,
      },
    });

    sendSuccess(res, user, 'Usuário atualizado com sucesso');
  } catch (error) {
    console.error('Update user error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'Usuário não encontrado', 404);
      return;
    }
    sendError(res, 'Erro ao atualizar usuário');
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    sendSuccess(res, null, 'Usuário deletado com sucesso');
  } catch (error) {
    console.error('Delete user error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'Usuário não encontrado', 404);
      return;
    }
    sendError(res, 'Erro ao deletar usuário');
  }
};

