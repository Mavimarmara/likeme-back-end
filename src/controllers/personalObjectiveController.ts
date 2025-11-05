import { Request, Response } from 'express';
import prisma from '@/config/database';
import { sendSuccess, sendError } from '@/utils/response';

export const createPersonalObjective = async (req: Request, res: Response): Promise<void> => {
  try {
    const objectiveData = req.body;

    const objective = await prisma.personalObjective.create({
      data: objectiveData,
      include: {
        users: true,
      },
    });

    sendSuccess(res, objective, 'Objetivo pessoal criado com sucesso', 201);
  } catch (error) {
    console.error('Create personal objective error:', error);
    if ((error as any).code === 'P2002') {
      sendError(res, 'Objetivo com este nome já existe', 409);
      return;
    }
    sendError(res, 'Erro ao criar objetivo pessoal');
  }
};

export const getPersonalObjectiveById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const objective = await prisma.personalObjective.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: {
              include: {
                person: true,
              },
            },
          },
        },
      },
    });

    if (!objective) {
      sendError(res, 'Objetivo pessoal não encontrado', 404);
      return;
    }

    sendSuccess(res, objective, 'Objetivo pessoal obtido com sucesso');
  } catch (error) {
    console.error('Get personal objective error:', error);
    sendError(res, 'Erro ao obter objetivo pessoal');
  }
};

export const getAllPersonalObjectives = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [objectives, total] = await Promise.all([
      prisma.personalObjective.findMany({
        skip,
        take: limit,
        orderBy: [
          { order: 'asc' },
          { name: 'asc' },
        ],
        where: {
          deletedAt: null,
        },
      }),
      prisma.personalObjective.count({
        where: {
          deletedAt: null,
        },
      }),
    ]);

    sendSuccess(res, {
      objectives,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Objetivos pessoais obtidos com sucesso');
  } catch (error) {
    console.error('Get all personal objectives error:', error);
    sendError(res, 'Erro ao obter objetivos pessoais');
  }
};

export const updatePersonalObjective = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const objective = await prisma.personalObjective.update({
      where: { id },
      data: updateData,
      include: {
        users: true,
      },
    });

    sendSuccess(res, objective, 'Objetivo pessoal atualizado com sucesso');
  } catch (error) {
    console.error('Update personal objective error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'Objetivo pessoal não encontrado', 404);
      return;
    }
    if ((error as any).code === 'P2002') {
      sendError(res, 'Objetivo com este nome já existe', 409);
      return;
    }
    sendError(res, 'Erro ao atualizar objetivo pessoal');
  }
};

export const deletePersonalObjective = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.personalObjective.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    sendSuccess(res, null, 'Objetivo pessoal deletado com sucesso');
  } catch (error) {
    console.error('Delete personal objective error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'Objetivo pessoal não encontrado', 404);
      return;
    }
    sendError(res, 'Erro ao deletar objetivo pessoal');
  }
};

