import { Request, Response } from 'express';
import prisma from '@/config/database';
import { sendSuccess, sendError } from '@/utils/response';

export const createUserPersonalObjective = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, objectiveId } = req.body;

    const objective = await prisma.personalObjective.findUnique({
      where: { id: objectiveId },
    });

    if (!objective) {
      sendError(res, 'Objetivo pessoal não encontrado', 404);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      sendError(res, 'Usuário não encontrado', 404);
      return;
    }

    const existing = await prisma.userPersonalObjective.findFirst({
      where: {
        userId,
        objectiveId,
        deletedAt: null,
      },
    });

    if (existing) {
      sendError(res, 'Usuário já possui este objetivo', 409);
      return;
    }

    const userObjective = await prisma.userPersonalObjective.create({
      data: {
        userId,
        objectiveId,
      },
      include: {
        user: {
          include: {
            person: true,
          },
        },
        objective: true,
      },
    });

    sendSuccess(res, userObjective, 'Objetivo atribuído ao usuário com sucesso', 201);
  } catch (error) {
    console.error('Create user personal objective error:', error);
    sendError(res, 'Erro ao atribuir objetivo ao usuário');
  }
};

export const getUserPersonalObjective = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, objectiveId } = req.params;

    const userObjective = await prisma.userPersonalObjective.findFirst({
      where: {
        userId,
        objectiveId,
        deletedAt: null,
      },
      include: {
        user: {
          include: {
            person: true,
          },
        },
        objective: true,
      },
    });

    if (!userObjective) {
      sendError(res, 'Relação não encontrada', 404);
      return;
    }

    sendSuccess(res, userObjective, 'Relação obtida com sucesso');
  } catch (error) {
    console.error('Get user personal objective error:', error);
    sendError(res, 'Erro ao obter relação');
  }
};

export const getAllUserPersonalObjectives = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const userId = req.query.userId as string;
    const objectiveId = req.query.objectiveId as string;

    const where: any = {
      deletedAt: null,
    };

    if (userId) {
      where.userId = userId;
    }
    if (objectiveId) {
      where.objectiveId = objectiveId;
    }

    const [userObjectives, total] = await Promise.all([
      prisma.userPersonalObjective.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            include: {
              person: true,
            },
          },
          objective: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.userPersonalObjective.count({ where }),
    ]);

    sendSuccess(res, {
      userObjectives,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Relações obtidas com sucesso');
  } catch (error) {
    console.error('Get all user personal objectives error:', error);
    sendError(res, 'Erro ao obter relações');
  }
};

export const deleteUserPersonalObjective = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, objectiveId } = req.params;

    const userObjective = await prisma.userPersonalObjective.findFirst({
      where: {
        userId,
        objectiveId,
        deletedAt: null,
      },
    });

    if (!userObjective) {
      sendError(res, 'Relação não encontrada', 404);
      return;
    }

    await prisma.userPersonalObjective.update({
      where: {
        userId_objectiveId: {
          userId,
          objectiveId,
        },
      },
      data: { deletedAt: new Date() },
    });

    sendSuccess(res, null, 'Objetivo removido do usuário com sucesso');
  } catch (error) {
    console.error('Delete user personal objective error:', error);
    sendError(res, 'Erro ao remover objetivo do usuário');
  }
};

export const getMyObjectives = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    const userObjectives = await prisma.userPersonalObjective.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        objective: true,
      },
      orderBy: {
        objective: {
          order: 'asc',
        },
      },
    });

    sendSuccess(res, userObjectives, 'Objetivos do usuário obtidos com sucesso');
  } catch (error) {
    console.error('Get my objectives error:', error);
    sendError(res, 'Erro ao obter objetivos do usuário');
  }
};

export const addMyObjective = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { objectiveId } = req.body;

    if (!objectiveId) {
      sendError(res, 'objectiveId é obrigatório', 400);
      return;
    }

    const objective = await prisma.personalObjective.findUnique({
      where: { id: objectiveId },
    });

    if (!objective) {
      sendError(res, 'Objetivo pessoal não encontrado', 404);
      return;
    }

    const existing = await prisma.userPersonalObjective.findFirst({
      where: {
        userId,
        objectiveId,
        deletedAt: null,
      },
    });

    if (existing) {
      sendError(res, 'Você já possui este objetivo', 409);
      return;
    }

    const userObjective = await prisma.userPersonalObjective.create({
      data: {
        userId,
        objectiveId,
      },
      include: {
        objective: true,
      },
    });

    sendSuccess(res, userObjective, 'Objetivo adicionado com sucesso', 201);
  } catch (error) {
    console.error('Add my objective error:', error);
    sendError(res, 'Erro ao adicionar objetivo');
  }
};

export const removeMyObjective = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { objectiveId } = req.params;

    const userObjective = await prisma.userPersonalObjective.findFirst({
      where: {
        userId,
        objectiveId,
        deletedAt: null,
      },
    });

    if (!userObjective) {
      sendError(res, 'Você não possui este objetivo', 404);
      return;
    }

    await prisma.userPersonalObjective.update({
      where: {
        userId_objectiveId: {
          userId,
          objectiveId,
        },
      },
      data: { deletedAt: new Date() },
    });

    sendSuccess(res, null, 'Objetivo removido com sucesso');
  } catch (error) {
    console.error('Remove my objective error:', error);
    sendError(res, 'Erro ao remover objetivo');
  }
};

