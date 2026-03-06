import { Request, Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import { categoryService } from '@/services/category/categoryService';
import { PrismaErrorHandler } from '@/utils/errorHandlerHelper';

export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await categoryService.findAll();
    sendSuccess(res, { categories }, 'Categories retrieved successfully');
  } catch (error: unknown) {
    console.error('Get all categories error:', error);
    if (PrismaErrorHandler.isTableNotFoundError(error)) {
      sendError(res, PrismaErrorHandler.getTableNotFoundMessage(), 503, (error as Error)?.message);
      return;
    }
    sendError(res, 'Error retrieving categories', 500, (error as Error)?.message);
  }
};
