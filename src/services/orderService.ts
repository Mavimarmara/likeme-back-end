import prisma from '@/config/database';
import { Decimal } from '@prisma/client/runtime/library';
import type { Order, Prisma } from '@prisma/client';
import { productService } from './productService';

export class OrderAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderAuthorizationError';
  }
}

export interface OrderItemInput {
  productId: string;
  quantity: number;
  discount?: number;
}

export interface CreateOrderData {
  userId: string;
  items: OrderItemInput[];
  status?: string;
  shippingCost?: number;
  tax?: number;
  shippingAddress?: string;
  billingAddress?: string;
  notes?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  trackingNumber?: string;
}

export interface OrderQueryFilters {
  userId?: string;
  status?: string;
  paymentStatus?: string;
}

export class OrderService {
  private async validateUserExists(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new Error('User not found');
    }
  }

  private async validateProductForOrder(productId: string): Promise<void> {
    const product = await productService.findById(productId);
    
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    if (product.externalUrl) {
      throw new Error(`Product ${product.name} has external URL and cannot be added to cart. Please use the external link.`);
    }

    if (product.price === null || product.price === undefined) {
      throw new Error(`Product ${product.name} does not have a price`);
    }
  }

  private async validateOrderItems(items: OrderItemInput[]): Promise<void> {
    for (const item of items) {
      await this.validateProductForOrder(item.productId);
      
      const product = await productService.findById(item.productId);
      const availableQuantity = product!.quantity ?? 0;
      
      if (availableQuantity < item.quantity) {
        throw new Error(`Insufficient stock for product ${product!.name}`);
      }
    }
  }

  private calculateItemTotal(
    price: number,
    quantity: number,
    discount: number = 0
  ): Decimal {
    const productPrice = new Decimal(price.toString());
    const discountDecimal = new Decimal(discount);
    return productPrice.times(quantity).minus(discountDecimal);
  }

  private async calculateOrderTotals(
    items: OrderItemInput[]
  ): Promise<{ subtotal: Decimal; itemsWithPrice: any[] }> {
    let subtotal = new Decimal(0);
    const itemsWithPrice = [];

    for (const item of items) {
      const product = await productService.findById(item.productId);
      const productPrice = new Decimal(product!.price!.toString());
      const discount = new Decimal(item.discount || 0);
      const itemTotal = this.calculateItemTotal(
        parseFloat(productPrice.toString()),
        item.quantity,
        parseFloat(discount.toString())
      );

      subtotal = subtotal.plus(itemTotal);

      itemsWithPrice.push({
        ...item,
        productPrice,
      });
    }

    return { subtotal, itemsWithPrice };
  }

  private async updateProductStock(productId: string, quantity: number): Promise<void> {
    const product = await productService.findById(productId);
    
    if (!product || product.externalUrl || product.quantity === null) {
      return;
    }

    await prisma.product.update({
      where: { id: productId },
      data: {
        quantity: {
          decrement: quantity,
        },
      },
    });
  }

  async create(orderData: CreateOrderData): Promise<Order> {
    await this.validateUserExists(orderData.userId);
    await this.validateOrderItems(orderData.items);

    const { subtotal, itemsWithPrice } = await this.calculateOrderTotals(orderData.items);

    const shippingCost = new Decimal(orderData.shippingCost || 0);
    const tax = new Decimal(orderData.tax || 0);
    const total = subtotal.plus(shippingCost).plus(tax);

    const order = await prisma.order.create({
      data: {
        userId: orderData.userId,
        status: orderData.status || 'pending',
        subtotal,
        shippingCost,
        tax,
        total,
        shippingAddress: orderData.shippingAddress,
        billingAddress: orderData.billingAddress,
        notes: orderData.notes,
        paymentMethod: orderData.paymentMethod,
        paymentStatus: 'pending',
        trackingNumber: orderData.trackingNumber,
        items: {
          create: itemsWithPrice.map((item: any) => {
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

    for (const item of orderData.items) {
      await this.updateProductStock(item.productId, item.quantity);
    }

    return order;
  }

  private buildWhereClause(filters: OrderQueryFilters): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
    };

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }

    return where;
  }

  async findAll(
    page: number,
    limit: number,
    filters: OrderQueryFilters,
    currentUserId?: string
  ): Promise<{ orders: Order[]; total: number }> {
    const skip = (page - 1) * limit;
    
    if (currentUserId) {
      filters.userId = currentUserId;
    }

    const where = this.buildWhereClause(filters);

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

    return { orders, total };
  }

  async findById(id: string, userId?: string): Promise<Order | null> {
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
      return null;
    }

    if (userId && order.userId !== userId) {
      throw new OrderAuthorizationError('Not authorized to view this order');
    }

    return order;
  }

  async update(id: string, updateData: any, userId?: string): Promise<Order> {
    const order = await this.findById(id, userId);
    
    if (!order) {
      throw new Error('Order not found');
    }

    return prisma.order.update({
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
  }

  async delete(id: string, userId?: string, restoreStock: boolean = false): Promise<void> {
    const order = await this.findById(id, userId);
    
    if (!order) {
      throw new Error('Order not found');
    }

    await prisma.order.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    if (restoreStock && 'items' in order && Array.isArray(order.items)) {
      for (const item of order.items as any[]) {
        await this.updateProductStock(item.productId, -item.quantity);
      }
    }
  }

  async cancel(id: string, userId?: string): Promise<Order> {
    const order = await this.findById(id, userId);
    
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'cancelled') {
      throw new Error('Order is already cancelled');
    }

    const orderWithItems = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (orderWithItems && orderWithItems.items) {
      for (const item of orderWithItems.items) {
        await this.updateProductStock(item.productId, -item.quantity);
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: 'cancelled' },
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

    return updatedOrder as Order;
  }
}

export const orderService = new OrderService();
