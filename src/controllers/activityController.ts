import { Request, Response } from 'express';
import prisma from '@/config/database';
import { sendSuccess, sendError, sendPaginated } from '@/utils/response';
import { CreateActivityData, UpdateActivityData, SearchQuery } from '@/types';

export const createActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const activityData: CreateActivityData = req.body;

    const activity = await prisma.activity.create({
      data: {
        userId,
        ...activityData,
        scheduledAt: activityData.scheduledAt ? new Date(activityData.scheduledAt) : undefined,
      },
    });

    sendSuccess(res, activity, 'Atividade criada com sucesso', 201);
  } catch (error) {
    console.error('Create activity error:', error);
    sendError(res, 'Erro ao criar atividade');
  }
};

export const getActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { page = 1, limit = 10, category, search, sortBy = 'createdAt', sortOrder = 'desc' }: SearchQuery = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { userId };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.activity.count({ where }),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    sendPaginated(res, activities, {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
    }, 'Atividades obtidas com sucesso');
  } catch (error) {
    console.error('Get activities error:', error);
    sendError(res, 'Erro ao obter atividades');
  }
};

export const getActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const activity = await prisma.activity.findFirst({
      where: { id, userId },
    });

    if (!activity) {
      sendError(res, 'Atividade não encontrada', 404);
      return;
    }

    sendSuccess(res, activity, 'Atividade obtida com sucesso');
  } catch (error) {
    console.error('Get activity error:', error);
    sendError(res, 'Erro ao obter atividade');
  }
};

export const updateActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const updateData: UpdateActivityData = req.body;

    const activity = await prisma.activity.findFirst({
      where: { id, userId },
    });

    if (!activity) {
      sendError(res, 'Atividade não encontrada', 404);
      return;
    }

    const updatedActivity = await prisma.activity.update({
      where: { id },
      data: {
        ...updateData,
        scheduledAt: updateData.scheduledAt ? new Date(updateData.scheduledAt) : undefined,
        completedAt: updateData.completed ? new Date() : activity.completedAt,
      },
    });

    sendSuccess(res, updatedActivity, 'Atividade atualizada com sucesso');
  } catch (error) {
    console.error('Update activity error:', error);
    sendError(res, 'Erro ao atualizar atividade');
  }
};

export const deleteActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const activity = await prisma.activity.findFirst({
      where: { id, userId },
    });

    if (!activity) {
      sendError(res, 'Atividade não encontrada', 404);
      return;
    }

    await prisma.activity.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Atividade deletada com sucesso');
  } catch (error) {
    console.error('Delete activity error:', error);
    sendError(res, 'Erro ao deletar atividade');
  }
};

export const completeActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const activity = await prisma.activity.findFirst({
      where: { id, userId },
    });

    if (!activity) {
      sendError(res, 'Atividade não encontrada', 404);
      return;
    }

    if (activity.completed) {
      sendError(res, 'Atividade já foi completada', 400);
      return;
    }

    const updatedActivity = await prisma.activity.update({
      where: { id },
      data: {
        completed: true,
        completedAt: new Date(),
      },
    });

    sendSuccess(res, updatedActivity, 'Atividade completada com sucesso');
  } catch (error) {
    console.error('Complete activity error:', error);
    sendError(res, 'Erro ao completar atividade');
  }
};
