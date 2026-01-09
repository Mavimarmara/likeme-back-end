import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { sendSuccess, sendError } from '@/utils/response';
import { activityService } from '@/services/activity/activityService';
import { PrismaErrorHandler } from '@/utils/errorHandlerHelper';

export const createActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || req.body.userId;

    if (!userId) {
      sendError(res, 'User not identified', 400);
      return;
    }

    // Preencher name com "evento sem nome" se estiver vazio ou não fornecido
    const name = req.body.name?.trim() || 'evento sem nome';

    const activityData = {
      ...req.body,
      name,
      userId,
    };

    const activity = await activityService.create(activityData);
    sendSuccess(res, activity, 'Activity created successfully', 201);
  } catch (error: any) {
    console.error('Create activity error:', error);
    
    // Tratar erros específicos do Prisma
    if (error.code === 'P2002') {
      sendError(res, 'Activity already exists', 409);
      return;
    }
    
    if (error.code === 'P2003') {
      sendError(res, 'Invalid user reference', 400);
      return;
    }
    
    // Tratar erros de validação
    if (error.name === 'ValidationError' || error.isJoi) {
      sendError(res, error.message || 'Invalid activity data', 400);
      return;
    }
    
    // Tratar erros de formato de data
    if (error.message && error.message.includes('Invalid date')) {
      sendError(res, 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)', 400);
      return;
    }
    
    // Erro genérico
    sendError(res, error.message || 'Error creating activity', 500);
  }
};

export const getActivityById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    const activity = await activityService.findById(id);

    if (!activity) {
      sendError(res, 'Activity not found', 404);
      return;
    }

    if (currentUserId && activity.userId !== currentUserId) {
      sendError(res, 'Not authorized to view this activity', 403);
      return;
    }

    sendSuccess(res, activity, 'Activity retrieved successfully');
  } catch (error: any) {
    console.error('Get activity error:', error);
    sendError(res, 'Error retrieving activity');
  }
};

export const getAllActivities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const filters: any = {
      userId: currentUserId,
    };

    if (req.query.type) {
      filters.type = req.query.type as string;
    }

    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }

    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }

    // Incluir atividades deletadas (skipadas) quando includeDeleted for true
    if (req.query.includeDeleted === 'true' || req.query.includeDeleted === '1') {
      filters.includeDeleted = true;
    }

    const { activities, total } = await activityService.findAll(page, limit, filters);

    sendSuccess(res, {
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Activities retrieved successfully');
  } catch (error: any) {
    console.error('Get all activities error:', error);
    sendError(res, 'Error retrieving activities');
  }
};

export const updateActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    const activity = await activityService.findById(id);

    if (!activity) {
      sendError(res, 'Activity not found', 404);
      return;
    }

    if (currentUserId && activity.userId !== currentUserId) {
      sendError(res, 'Not authorized to update this activity', 403);
      return;
    }

    // Preencher name com "evento sem nome" se estiver vazio ou não fornecido
    const updateData = { ...req.body };
    if (updateData.name !== undefined && (!updateData.name || !updateData.name.trim())) {
      updateData.name = 'evento sem nome';
    }

    const updatedActivity = await activityService.update(id, updateData);
    sendSuccess(res, updatedActivity, 'Activity updated successfully');
  } catch (error: any) {
    console.error('Update activity error:', error);
    
    if (error.message === 'Activity not found') {
      sendError(res, error.message, 404);
      return;
    }
    
    sendError(res, 'Error updating activity');
  }
};

export const deleteActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    const activity = await activityService.findById(id);

    if (!activity) {
      sendError(res, 'Activity not found', 404);
      return;
    }

    if (currentUserId && activity.userId !== currentUserId) {
      sendError(res, 'Not authorized to delete this activity', 403);
      return;
    }

    await activityService.delete(id);
    sendSuccess(res, null, 'Activity deleted successfully');
  } catch (error: any) {
    console.error('Delete activity error:', error);
    
    if (error.message === 'Activity not found') {
      sendError(res, error.message, 404);
      return;
    }
    
    sendError(res, 'Error deleting activity');
  }
};
