import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import prisma from '@/config/database';
import { sendSuccess, sendError } from '@/utils/response';
import { Decimal } from '@prisma/client/runtime/library';

export const createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orderData = req.body;
    const userId = req.user?.id || orderData.userId;

    if (!userId) {
      sendError(res, 'User not identified', 400);
      return;
    }

    // Validate if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      sendError(res, 'User not found', 404);
      return;
    }

    // Calculate totals from items
    let subtotal = new Decimal(0);
    const items = orderData.items || [];
    const itemsWithProduct = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product || product.deletedAt) {
        sendError(res, `Product ${item.productId} not found`, 404);
        return;
      }

      // Products with externalUrl cannot be added to orders (they redirect to external site)
      if (product.externalUrl) {
        sendError(res, `Product ${product.name} has external URL and cannot be added to cart. Please use the external link.`, 400);
        return;
      }

      // Check if product has price (required for orders)
      if (product.price === null || product.price === undefined) {
        sendError(res, `Product ${product.name} does not have a price`, 400);
        return;
      }

      // Check stock availability (quantity can be null for external products, but we already checked externalUrl above)
      const availableQuantity = product.quantity ?? 0;
      if (availableQuantity < item.quantity) {
        sendError(res, `Insufficient stock for product ${product.name}`, 400);
        return;
      }

      const productPrice = new Decimal(product.price.toString());
      const discount = new Decimal(item.discount || 0);
      const itemTotal = productPrice.times(item.quantity).minus(discount);
      subtotal = subtotal.plus(itemTotal);

      // Store product for use in item creation
      itemsWithProduct.push({
        ...item,
        productPrice,
      });
    }

    const shippingCost = new Decimal(orderData.shippingCost || 0);
    const tax = new Decimal(orderData.tax || 0);
    const total = subtotal.plus(shippingCost).plus(tax);

    // Create the order
    const order = await prisma.order.create({
      data: {
        userId,
        status: orderData.status || 'pending',
        subtotal,
        shippingCost,
        tax,
        total,
        shippingAddress: orderData.shippingAddress,
        billingAddress: orderData.billingAddress,
        notes: orderData.notes,
        paymentMethod: orderData.paymentMethod,
        paymentStatus: orderData.paymentStatus || 'pending',
        trackingNumber: orderData.trackingNumber,
        items: {
          create: itemsWithProduct.map((item: any) => {
            const discount = new Decimal(item.discount || 0);
            const itemTotal = item.productPrice.times(item.quantity).minus(discount);
            
            return {
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.productPrice,
              discount,
              total: itemTotal,
            };
          }),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          include: {
            person: true,
          },
        },
      },
    });

    // Update product stock (only for products without externalUrl)
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });
      
      // Only update stock if product doesn't have externalUrl and has quantity
      if (product && !product.externalUrl && product.quantity !== null) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });
      }
    }

    sendSuccess(res, order, 'Order created successfully', 201);
  } catch (error) {
    console.error('Create order error:', error);
    sendError(res, 'Erro ao criar pedido');
  }
};

export const getOrderById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          where: { deletedAt: null },
          include: {
            product: true,
          },
        },
        user: {
          include: {
            person: true,
          },
        },
      },
    });

    if (!order || order.deletedAt) {
      sendError(res, 'Order not found', 404);
      return;
    }

    // Check if user has permission to view the order
    if (currentUserId && order.userId !== currentUserId) {
      sendError(res, 'Not authorized to view this order', 403);
      return;
    }

    sendSuccess(res, order, 'Order retrieved successfully');
  } catch (error) {
    console.error('Get order error:', error);
    sendError(res, 'Erro ao obter pedido');
  }
};

export const getAllOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;
    const paymentStatus = req.query.paymentStatus as string;
    const currentUserId = req.user?.id;

    const where: any = {
      deletedAt: null,
    };

    // Se não for admin, filtra apenas pedidos do usuário atual
    if (currentUserId) {
      where.userId = currentUserId;
    } else if (req.query.userId) {
      where.userId = req.query.userId as string;
    }

    if (status) {
      where.status = status;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        skip,
        take: limit,
        where,
        include: {
          items: {
            where: { deletedAt: null },
            include: {
              product: true,
            },
          },
          user: {
            include: {
              person: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    sendSuccess(res, {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Orders retrieved successfully');
  } catch (error) {
    console.error('Get all orders error:', error);
    sendError(res, 'Erro ao obter pedidos');
  }
};

export const updateOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const currentUserId = req.user?.id;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order || order.deletedAt) {
      sendError(res, 'Order not found', 404);
      return;
    }

    // Check permission (only the owner or admin can update)
    if (currentUserId && order.userId !== currentUserId) {
      sendError(res, 'Not authorized to update this order', 403);
      return;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          where: { deletedAt: null },
          include: {
            product: true,
          },
        },
        user: {
          include: {
            person: true,
          },
        },
      },
    });

    sendSuccess(res, updatedOrder, 'Order updated successfully');
  } catch (error) {
    console.error('Update order error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'Order not found', 404);
      return;
    }
    sendError(res, 'Error updating order');
  }
};

export const deleteOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!order || order.deletedAt) {
      sendError(res, 'Order not found', 404);
      return;
    }

    // Check permission
    if (currentUserId && order.userId !== currentUserId) {
      sendError(res, 'Not authorized to delete this order', 403);
      return;
    }

    // If order was cancelled, restore stock
    if (order.status === 'cancelled' || req.body.restoreStock) {
      for (const item of order.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              increment: item.quantity,
            },
          },
        });
      }
    }

    await prisma.order.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    sendSuccess(res, null, 'Order deleted successfully');
  } catch (error) {
    console.error('Delete order error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'Order not found', 404);
      return;
    }
    sendError(res, 'Error deleting order');
  }
};

export const cancelOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!order || order.deletedAt) {
      sendError(res, 'Order not found', 404);
      return;
    }

    // Check permission
    if (currentUserId && order.userId !== currentUserId) {
      sendError(res, 'Not authorized to cancel this order', 403);
      return;
    }

    if (order.status === 'cancelled') {
      sendError(res, 'Order is already cancelled', 400);
      return;
    }

    // Restore product stock
    for (const item of order.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          quantity: {
            increment: item.quantity,
          },
        },
      });
    }

    const cancelledOrder = await prisma.order.update({
      where: { id },
      data: { 
        status: 'cancelled',
        paymentStatus: 'refunded',
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          include: {
            person: true,
          },
        },
      },
    });

    sendSuccess(res, cancelledOrder, 'Order cancelled successfully');
  } catch (error) {
    console.error('Cancel order error:', error);
    sendError(res, 'Error cancelling order');
  }
};
