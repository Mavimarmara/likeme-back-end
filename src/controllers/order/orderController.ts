import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { sendSuccess, sendError } from '@/utils/response';
import { orderService, OrderAuthorizationError } from '@/services/order/orderService';

export const createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || req.body.userId;

    if (!userId) {
      sendError(res, 'User not identified', 400);
      return;
    }

    // Validação adicional: se paymentMethod é credit_card, cardData e billingAddress (objeto) são obrigatórios
    if (req.body.paymentMethod === 'credit_card') {
      if (!req.body.cardData) {
        sendError(res, 'cardData is required when paymentMethod is credit_card', 400);
        return;
      }
      if (!req.body.billingAddress || typeof req.body.billingAddress === 'string') {
        sendError(res, 'billingAddress must be an object when paymentMethod is credit_card', 400);
        return;
      }
    }

    const orderData = {
      ...req.body,
      userId,
    };

    const order = await orderService.create(orderData);
    sendSuccess(res, order, 'Order created successfully', 201);
  } catch (error: any) {
    console.error('Create order error:', error);
    
    if (error.message === 'User not found') {
      sendError(res, error.message, 404);
      return;
    }
    
    if (error.message.includes('Product') && error.message.includes('not found')) {
      sendError(res, error.message, 404);
      return;
    }
    
    if (error.message.includes('external URL') || 
        error.message.includes('does not have a price') ||
        error.message.includes('Insufficient stock')) {
      sendError(res, error.message, 400);
      return;
    }
    
    // Erros relacionados a Pagarme
    if (error.message && (
      error.message.includes('Pagarme') ||
      error.message.includes('transaction') ||
      error.message.includes('payment') ||
      error.message.includes('API key') ||
      error.message.includes('card') ||
      error.message.includes('billing')
    )) {
      sendError(res, `Erro ao processar pagamento: ${error.message}`, 400);
      return;
    }
    
    sendError(res, 'Erro ao criar pedido');
  }
};

export const getOrderById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    const order = await orderService.findById(id, currentUserId);

    if (!order) {
      sendError(res, 'Order not found', 404);
      return;
    }

    sendSuccess(res, order, 'Order retrieved successfully');
  } catch (error: any) {
    console.error('Get order error:', error);
    
    if (error instanceof OrderAuthorizationError) {
      sendError(res, error.message, 403);
      return;
    }
    
    sendError(res, 'Erro ao obter pedido');
  }
};

export const getAllOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const currentUserId = req.user?.id;

    const filters = {
      userId: req.query.userId as string,
      status: req.query.status as string,
      paymentStatus: req.query.paymentStatus as string,
    };

    const { orders, total } = await orderService.findAll(page, limit, filters, currentUserId);

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
    const currentUserId = req.user?.id;

    const updatedOrder = await orderService.update(id, req.body, currentUserId);
    sendSuccess(res, updatedOrder, 'Order updated successfully');
  } catch (error: any) {
    console.error('Update order error:', error);
    
    if (error.message === 'Order not found' || (error as any).code === 'P2025') {
      sendError(res, 'Order not found', 404);
      return;
    }
    
    if (error instanceof OrderAuthorizationError) {
      sendError(res, error.message, 403);
      return;
    }
    
    sendError(res, 'Error updating order');
  }
};

export const deleteOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const restoreStock = req.body.restoreStock || false;

    await orderService.delete(id, currentUserId, restoreStock);
    sendSuccess(res, null, 'Order deleted successfully');
  } catch (error: any) {
    console.error('Delete order error:', error);
    
    if (error.message === 'Order not found' || (error as any).code === 'P2025') {
      sendError(res, 'Order not found', 404);
      return;
    }
    
    if (error instanceof OrderAuthorizationError) {
      sendError(res, error.message, 403);
      return;
    }
    
    sendError(res, 'Error deleting order');
  }
};

export const cancelOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    const cancelledOrder = await orderService.cancel(id, currentUserId);
    sendSuccess(res, cancelledOrder, 'Order cancelled successfully');
  } catch (error: any) {
    console.error('Cancel order error:', error);
    
    if (error.message === 'Order not found') {
      sendError(res, error.message, 404);
      return;
    }
    
    if (error.message === 'Order is already cancelled') {
      sendError(res, error.message, 400);
      return;
    }
    
    if (error instanceof OrderAuthorizationError) {
      sendError(res, error.message, 403);
      return;
    }
    
    sendError(res, 'Error cancelling order');
  }
};

export const validateCartItems = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      sendError(res, 'Items array is required', 400);
      return;
    }

    const validation = await orderService.validateCartItems(items);
    sendSuccess(res, validation, 'Cart items validated successfully');
  } catch (error: any) {
    console.error('Validate cart items error:', error);
    sendError(res, 'Erro ao validar itens do carrinho');
  }
};
