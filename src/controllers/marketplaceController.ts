import { Request, Response } from 'express';
import prisma from '@/config/database';
import { sendSuccess, sendError, sendPaginated } from '@/utils/response';
import { CreateProductData, UpdateProductData, CreateOrderData, SearchQuery } from '@/types';

// Product controllers
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const productData: CreateProductData = req.body;

    const product = await prisma.product.create({
      data: productData,
    });

    sendSuccess(res, product, 'Produto criado com sucesso', 201);
  } catch (error) {
    console.error('Create product error:', error);
    sendError(res, 'Erro ao criar produto');
  }
};

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, category, search, sortBy = 'createdAt', sortOrder = 'desc' }: SearchQuery = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    sendPaginated(res, products, {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
    }, 'Produtos obtidos com sucesso');
  } catch (error) {
    console.error('Get products error:', error);
    sendError(res, 'Erro ao obter produtos');
  }
};

export const getProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      sendError(res, 'Produto não encontrado', 404);
      return;
    }

    sendSuccess(res, product, 'Produto obtido com sucesso');
  } catch (error) {
    console.error('Get product error:', error);
    sendError(res, 'Erro ao obter produto');
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: UpdateProductData = req.body;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      sendError(res, 'Produto não encontrado', 404);
      return;
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    sendSuccess(res, updatedProduct, 'Produto atualizado com sucesso');
  } catch (error) {
    console.error('Update product error:', error);
    sendError(res, 'Erro ao atualizar produto');
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      sendError(res, 'Produto não encontrado', 404);
      return;
    }

    await prisma.product.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Produto deletado com sucesso');
  } catch (error) {
    console.error('Delete product error:', error);
    sendError(res, 'Erro ao deletar produto');
  }
};

// Order controllers
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const orderData: CreateOrderData = req.body;

    // Calculate total
    const productIds = orderData.items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    let total = 0;
    const orderItems = [];

    for (const item of orderData.items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        sendError(res, `Produto ${item.productId} não encontrado`, 404);
        return;
      }

      if (!product.inStock || product.stock < item.quantity) {
        sendError(res, `Produto ${product.title} não está disponível na quantidade solicitada`, 400);
        return;
      }

      const itemTotal = Number(product.price) * item.quantity;
      total += itemTotal;

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
      });
    }

    // Create order with items
    const order = await prisma.order.create({
      data: {
        userId,
        total,
        address: orderData.address,
        orderItems: {
          create: orderItems,
        },
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    // Update product stock
    for (const item of orderData.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity },
        },
      });
    }

    sendSuccess(res, order, 'Pedido criado com sucesso', 201);
  } catch (error) {
    console.error('Create order error:', error);
    sendError(res, 'Erro ao criar pedido');
  }
};

export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { page = 1, limit = 10, status }: any = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    sendPaginated(res, orders, {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
    }, 'Pedidos obtidos com sucesso');
  } catch (error) {
    console.error('Get orders error:', error);
    sendError(res, 'Erro ao obter pedidos');
  }
};

export const getOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: { id, userId },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      sendError(res, 'Pedido não encontrado', 404);
      return;
    }

    sendSuccess(res, order, 'Pedido obtido com sucesso');
  } catch (error) {
    console.error('Get order error:', error);
    sendError(res, 'Erro ao obter pedido');
  }
};

export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      sendError(res, 'Pedido não encontrado', 404);
      return;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    sendSuccess(res, updatedOrder, 'Status do pedido atualizado com sucesso');
  } catch (error) {
    console.error('Update order status error:', error);
    sendError(res, 'Erro ao atualizar status do pedido');
  }
};
