import prisma from '@/config/database';
import type {
  OrderRepository,
  CreateOrderData,
  OrderData,
  UpdateOrderData,
  OrderFilters,
  OrderWithItemsData,
} from './OrderRepository';

export class PrismaOrderRepository implements OrderRepository {
  async save(data: CreateOrderData): Promise<{ id: string }> {
    const order = await prisma.order.create({
      data: {
        userId: data.userId,
        total: data.total,
        subtotal: data.subtotal,
        shippingCost: data.shippingCost ?? 0,
        tax: data.tax ?? 0,
        status: data.status ?? 'pending',
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentStatus ?? 'pending',
        paymentTransactionId: data.paymentTransactionId,
        shippingAddress: data.shippingAddress,
        billingAddress: data.billingAddress,
        notes: data.notes,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            discount: item.discount ?? 0,
          })),
        },
      },
      select: { id: true },
    });

    return { id: order.id };
  }

  async findById(id: string): Promise<OrderData | null> {
    const order = await prisma.order.findUnique({
      where: { id },
    });

    return order ? this.mapToOrderData(order) : null;
  }

  async findByUserId(userId: string, filters?: OrderFilters): Promise<OrderData[]> {
    const where: any = { userId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = filters.fromDate;
      if (filters.toDate) where.createdAt.lte = filters.toDate;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.mapToOrderData(order));
  }

  async findWithItems(id: string): Promise<OrderWithItemsData | null> {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!order) return null;

    return {
      id: order.id,
      userId: order.userId,
      total: Number(order.total),
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      tax: Number(order.tax),
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      paymentTransactionId: order.paymentTransactionId,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      notes: order.notes,
      trackingNumber: order.trackingNumber,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
        discount: Number(item.discount),
        product: {
          id: item.product.id,
          name: item.product.name,
          description: item.product.description,
        },
      })),
      user: {
        id: order.user.id,
        username: order.user.username,
      },
    };
  }

  async update(id: string, data: UpdateOrderData): Promise<void> {
    await prisma.order.update({
      where: { id },
      data: {
        status: data.status,
        paymentStatus: data.paymentStatus,
        paymentTransactionId: data.paymentTransactionId,
        trackingNumber: data.trackingNumber,
        shippingAddress: data.shippingAddress,
        billingAddress: data.billingAddress,
        notes: data.notes,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.order.delete({
      where: { id },
    });
  }

  private mapToOrderData(order: any): OrderData {
    return {
      id: order.id,
      userId: order.userId,
      total: Number(order.total),
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      tax: Number(order.tax),
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      paymentTransactionId: order.paymentTransactionId,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      notes: order.notes,
      trackingNumber: order.trackingNumber,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
