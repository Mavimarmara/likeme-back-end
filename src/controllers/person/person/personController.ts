import { Request, Response } from 'express';
import prisma from '@/config/database';
import { sendSuccess, sendError } from '@/utils/response';

export const createPerson = async (req: Request, res: Response): Promise<void> => {
  try {
    const personData = req.body;

    const person = await prisma.person.create({
      data: personData,
      include: {
        contacts: true,
        user: true,
      },
    });

    sendSuccess(res, person, 'Pessoa criada com sucesso', 201);
  } catch (error) {
    console.error('Create person error:', error);
    sendError(res, 'Erro ao criar pessoa');
  }
};

export const getPersonById = async (req: Request, res: Response): Promise<void> => {
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

export const getAllPersons = async (req: Request, res: Response): Promise<void> => {
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

export const updatePerson = async (req: Request, res: Response): Promise<void> => {
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

export const deletePerson = async (req: Request, res: Response): Promise<void> => {
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

