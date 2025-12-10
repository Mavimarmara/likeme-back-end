import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import prisma from '@/config/database';
import { sendSuccess, sendError } from '@/utils/response';

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const productData = req.body;

    if (productData.sku) {
      const existingProduct = await prisma.product.findUnique({
        where: { sku: productData.sku },
      });

      if (existingProduct) {
        sendError(res, 'SKU already in use', 409);
        return;
      }
    }

    const product = await prisma.product.create({
      data: {
        name: productData.name,
        description: productData.description,
        sku: productData.sku,
        price: productData.price,
        cost: productData.cost,
        quantity: productData.quantity || 0,
        image: productData.image,
        category: productData.category,
        brand: productData.brand,
        status: productData.status || 'active',
        weight: productData.weight,
        dimensions: productData.dimensions,
      },
    });

    sendSuccess(res, product, 'Product created successfully', 201);
  } catch (error) {
    console.error('Create product error:', error);
    sendError(res, 'Error creating product');
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        orderItems: {
          where: { deletedAt: null },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        ads: {
          where: { deletedAt: null },
          include: {
            advertiser: true,
          },
        },
      },
    });

    if (!product || product.deletedAt) {
      sendError(res, 'Product not found', 404);
      return;
    }

    sendSuccess(res, product, 'Product retrieved successfully');
  } catch (error) {
    console.error('Get product error:', error);
    sendError(res, 'Error retrieving product');
  }
};

export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const category = req.query.category as string;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const where: any = {
      deletedAt: null,
    };

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    sendSuccess(res, {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Products retrieved successfully');
  } catch (error) {
    console.error('Get all products error:', error);
    sendError(res, 'Error retrieving products');
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct || existingProduct.deletedAt) {
      sendError(res, 'Product not found', 404);
      return;
    }

    if (updateData.sku && updateData.sku !== existingProduct.sku) {
      const skuExists = await prisma.product.findUnique({
        where: { sku: updateData.sku },
      });

      if (skuExists) {
        sendError(res, 'SKU already in use', 409);
        return;
      }
    }

    // Update status based on stock quantity
    if (updateData.quantity !== undefined) {
      if (updateData.quantity <= 0) {
        updateData.status = 'out_of_stock';
      } else if (existingProduct.status === 'out_of_stock' && updateData.quantity > 0) {
        updateData.status = 'active';
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    sendSuccess(res, product, 'Product updated successfully');
  } catch (error) {
    console.error('Update product error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'Product not found', 404);
      return;
    }
    sendError(res, 'Error updating product');
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product || product.deletedAt) {
      sendError(res, 'Product not found', 404);
      return;
    }

    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    sendSuccess(res, null, 'Product deleted successfully');
  } catch (error) {
    console.error('Delete product error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'Product not found', 404);
      return;
    }
    sendError(res, 'Error deleting product');
  }
};

export const updateStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { quantity, operation } = req.body; // operation: 'add', 'subtract', 'set'

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product || product.deletedAt) {
      sendError(res, 'Product not found', 404);
      return;
    }

    let newQuantity = product.quantity;
    if (operation === 'add') {
      newQuantity = product.quantity + quantity;
    } else if (operation === 'subtract') {
      newQuantity = Math.max(0, product.quantity - quantity);
    } else if (operation === 'set') {
      newQuantity = quantity;
    } else {
      sendError(res, 'Invalid operation. Use: add, subtract or set', 400);
      return;
    }

    const updateData: any = {
      quantity: newQuantity,
    };

    // Update status based on new quantity
    if (newQuantity <= 0) {
      updateData.status = 'out_of_stock';
    } else if (product.status === 'out_of_stock' && newQuantity > 0) {
      updateData.status = 'active';
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    sendSuccess(res, updatedProduct, 'Stock updated successfully');
  } catch (error) {
    console.error('Update stock error:', error);
    sendError(res, 'Error updating stock');
  }
};
