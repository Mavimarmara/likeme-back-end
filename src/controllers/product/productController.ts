import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { sendSuccess, sendError } from '@/utils/response';
import { productService } from '@/services/product/productService';
import { PrismaErrorHandler } from '@/utils/errorHandlerHelper';

export const createProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?.id;
    const product = await productService.create(req.body, sellerId);
    sendSuccess(res, product, 'Product created successfully', 201);
  } catch (error: any) {
    console.error('Create product error:', error);
    
    if (error.message === 'SKU already in use') {
      sendError(res, error.message, 409);
      return;
    }
    
    if (PrismaErrorHandler.isTableNotFoundError(error)) {
      sendError(res, PrismaErrorHandler.getTableNotFoundMessage(), 500, error?.message);
      return;
    }
    
    sendError(res, 'Error creating product', 500, error?.message);
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await productService.findById(id);

    if (!product) {
      sendError(res, 'Product not found', 404);
      return;
    }

    sendSuccess(res, product, 'Product retrieved successfully');
  } catch (error: any) {
    console.error('Get product error:', error);
    
    if (PrismaErrorHandler.isTableNotFoundError(error)) {
      sendError(res, PrismaErrorHandler.getTableNotFoundMessage(), 500, error?.message);
      return;
    }
    
    sendError(res, 'Error retrieving product', 500, error?.message);
  }
};

export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const filters = {
      category: req.query.category as string,
      status: req.query.status as string,
      search: req.query.search as string,
    };

    const { products, total } = await productService.findAll(page, limit, filters);

    sendSuccess(res, {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Products retrieved successfully');
  } catch (error: any) {
    console.error('Get all products error:', error);
    
    if (PrismaErrorHandler.isTableNotFoundError(error)) {
      sendError(res, 'Database tables not initialized. Please run migration: prisma/migrations/add_product_order_ad_models.sql', 503, error?.message);
      return;
    }
    
    sendError(res, 'Error retrieving products', 500, error?.message);
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await productService.update(id, req.body);
    sendSuccess(res, product, 'Product updated successfully');
  } catch (error: any) {
    console.error('Update product error:', error);
    
    if (error.message === 'Product not found' || PrismaErrorHandler.isNotFoundError(error)) {
      sendError(res, 'Product not found', 404);
      return;
    }
    
    if (error.message === 'SKU already in use') {
      sendError(res, error.message, 409);
      return;
    }
    
    sendError(res, 'Error updating product');
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await productService.delete(id);
    sendSuccess(res, null, 'Product deleted successfully');
  } catch (error: any) {
    console.error('Delete product error:', error);
    
    if (error.message === 'Product not found' || PrismaErrorHandler.isNotFoundError(error)) {
      sendError(res, 'Product not found', 404);
      return;
    }
    
    sendError(res, 'Error deleting product');
  }
};

export const updateStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { quantity, operation } = req.body;
    
    const product = await productService.updateStock(id, { quantity, operation });
    sendSuccess(res, product, 'Stock updated successfully');
  } catch (error: any) {
    console.error('Update stock error:', error);
    
    if (error.message === 'Product not found') {
      sendError(res, error.message, 404);
      return;
    }
    
    if (error.message === 'Cannot update stock for products with external URL') {
      sendError(res, error.message, 400);
      return;
    }
    
    if (error.message.includes('Invalid operation')) {
      sendError(res, error.message, 400);
      return;
    }
    
    sendError(res, 'Error updating stock');
  }
};
