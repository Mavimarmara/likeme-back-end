import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { sendSuccess, sendError } from '@/utils/response';
import { activityService } from '@/services/activityService';
import { PrismaErrorHandler } from '@/utils/errorHandlerHelper';

export const createActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || req.body.userId;

    if (!userId) {
      sendError(res, 'User not identified', 400);
      return;
    }

    const activityData = {
      ...req.body,
      userId,
    };

    const activity = await activityService.create(activityData);
    sendSuccess(res, activity, 'Activity created successfully', 201);
  } catch (error: any) {
    console.error('Create activity error:', error);
    sendError(res, 'Error creating activity');
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

    const updatedActivity = await activityService.update(id, req.body);
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
