import { Response } from 'express';
import prisma from '@/config/database';
import { sendSuccess, sendError } from '@/utils/response';
import { AuthenticatedRequest } from '@/types';

export const createOrUpdatePerson = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    const personData = req.body;

    if (!currentUserId) {
      sendError(res, 'Usuário não autenticado', 401);
      return;
    }

    // Buscar usuário completo para obter personId
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { personId: true },
    });

    if (!user) {
      sendError(res, 'Usuário não encontrado', 404);
      return;
    }

    let person;
    let isUpdate = false;

    if (user.personId) {
      // Se já tem personId, atualiza a person existente
      person = await prisma.person.update({
        where: { id: user.personId },
        data: personData,
        include: {
          contacts: true,
          user: true,
        },
      });
      isUpdate = true;
    } else {
      // Se não tem personId, cria nova person e associa ao usuário
      person = await prisma.person.create({
      data: personData,
      include: {
        contacts: true,
        user: true,
      },
    });

      // Associa a person ao usuário
      await prisma.user.update({
        where: { id: currentUserId },
        data: { personId: person.id },
      });
    }

    sendSuccess(
      res,
      person,
      isUpdate ? 'Pessoa atualizada com sucesso' : 'Pessoa criada com sucesso',
      isUpdate ? 200 : 201
    );
  } catch (error) {
    console.error('Create or update person error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'Pessoa não encontrada', 404);
      return;
    }
    sendError(res, 'Erro ao criar ou atualizar pessoa');
  }
};

export const getPersonById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const person = await prisma.person.findUnique({
      where: { id },
      include: {
        contacts: true,
        user: true,
      },
    });

    if (!person) {
      sendError(res, 'Pessoa não encontrada', 404);
      return;
    }

    sendSuccess(res, person, 'Pessoa obtida com sucesso');
  } catch (error) {
    console.error('Get person error:', error);
    sendError(res, 'Erro ao obter pessoa');
  }
};

export const getAllPersons = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [persons, total] = await Promise.all([
      prisma.person.findMany({
        skip,
        take: limit,
        include: {
          contacts: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
        where: {
          deletedAt: null,
        },
      }),
      prisma.person.count({
        where: {
          deletedAt: null,
        },
      }),
    ]);

    sendSuccess(res, {
      persons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Pessoas obtidas com sucesso');
  } catch (error) {
    console.error('Get all persons error:', error);
    sendError(res, 'Erro ao obter pessoas');
  }
};

export const updatePerson = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const person = await prisma.person.update({
      where: { id },
      data: updateData,
      include: {
        contacts: true,
        user: true,
      },
    });

    sendSuccess(res, person, 'Pessoa atualizada com sucesso');
  } catch (error) {
    console.error('Update person error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'Pessoa não encontrada', 404);
      return;
    }
    sendError(res, 'Erro ao atualizar pessoa');
  }
};

export const deletePerson = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.person.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    sendSuccess(res, null, 'Pessoa deletada com sucesso');
  } catch (error) {
    console.error('Delete person error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'Pessoa não encontrada', 404);
      return;
    }
    sendError(res, 'Erro ao deletar pessoa');
  }
};

