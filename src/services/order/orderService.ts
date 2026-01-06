import prisma from '@/config/database';
import { Decimal } from '@prisma/client/runtime/library';
import type { Order, Prisma } from '@prisma/client';
import { productService } from '../product/productService';
import {
  createCreditCardTransaction,
  CustomerData,
  AddressData,
  CreditCardData,
} from '@/clients/pagarme/pagarmeClient';
import { paymentSplitService } from '../payment/paymentSplitService';
import type {
  OrderItemInput,
  CreateOrderData,
  OrderQueryFilters,
  CartItemValidation,
  ValidateCartItemsResponse,
} from '@/interfaces/order/order';

export class OrderAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderAuthorizationError';
  }
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

    // Converter billingAddress para string se for objeto (para armazenar no banco)
    const billingAddressString = orderData.billingAddress 
      ? (typeof orderData.billingAddress === 'string' 
          ? orderData.billingAddress 
          : JSON.stringify(orderData.billingAddress))
      : null;

    const order = await prisma.order.create({
      data: {
        userId: orderData.userId,
        status: orderData.status || 'pending',
        subtotal,
        shippingCost,
        tax,
        total,
        shippingAddress: orderData.shippingAddress,
        billingAddress: billingAddressString,
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

    // Processar pagamento com Pagarme se cardData e billingAddress forem fornecidos
    if (orderData.cardData && orderData.billingAddress) {
      try {
        await this.processPaymentForOrder(order, orderData.cardData, orderData.billingAddress);
      } catch (error: any) {
        // Se o pagamento falhar, atualizar status do pedido para failed
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'failed' },
        });
        // Re-throw o erro para que o controller possa tratá-lo
        throw error;
        // Reverter estoque dos produtos
        for (const item of orderData.items) {
          await this.updateProductStock(item.productId, -item.quantity);
        }
        throw error;
      }
      
      // Buscar pedido atualizado com status de pagamento
      const updatedOrder = await prisma.order.findUnique({
        where: { id: order.id },
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

    return order;
  }

  private async processPaymentForOrder(
    order: Order,
    cardData: CreditCardData,
    billingAddress: AddressData
  ): Promise<void> {
    // Buscar dados do usuário
    const orderWithUser = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        user: {
          include: {
            person: {
              include: {
                contacts: true,
              },
            },
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!orderWithUser) {
      throw new Error('Order not found');
    }

    // Buscar email do usuário
    const emailContact = orderWithUser.user.person.contacts?.find(
      (contact: any) => contact.type === 'email' && !contact.deletedAt
    );
    const email = emailContact?.value || '';

    if (!email) {
      throw new Error('User email not found');
    }

    // Preparar dados do cliente
    const customerData: CustomerData = {
      externalId: orderWithUser.userId,
      name: `${orderWithUser.user.person.firstName} ${orderWithUser.user.person.lastName}`,
      email,
      type: 'individual',
      country: 'br',
    };

    // Buscar CPF - OBRIGATÓRIO para Pagarme (tipo individual)
    // GARANTE que CPF do cardData seja sempre usado quando presente
    let cpf = '';
    
    // PRIORIDADE ABSOLUTA: CPF do cardData (enviado pelo frontend)
    if (cardData?.cpf) {
      cpf = cardData.cpf.replace(/\D/g, '');
      if (cpf.length >= 11) {
        console.log('[OrderService] ✅ CPF do cardData será usado:', cpf.substring(0, 3) + '***' + cpf.substring(cpf.length - 2));
      } else {
        console.warn('[OrderService] ⚠️  CPF do cardData inválido (menos de 11 dígitos), tentando fallback');
        cpf = '';
      }
    }
    
    // Fallback: CPF do perfil do usuário (nationalRegistration)
    if (!cpf || cpf.length < 11) {
      cpf = orderWithUser.user.person.nationalRegistration?.replace(/\D/g, '') || '';
      if (cpf && cpf.length >= 11) {
        console.log('[OrderService] ℹ️  Usando CPF do perfil do usuário (nationalRegistration)');
      }
    }
    
    // Validação final: CPF é obrigatório
    if (!cpf || cpf.length < 11) {
      throw new Error('CPF do cliente é obrigatório para processar pagamentos. Por favor, adicione o CPF no perfil do usuário ou no formulário de pagamento.');
    }
    
    customerData.documents = [
      {
        type: 'cpf',
        number: cpf,
      },
    ];

    // Buscar telefone - OBRIGATÓRIO para Pagarme
    // PRIORIDADE: Telefone do cardData (enviado pelo frontend)
    let phoneNumber = '';
    if (cardData?.phone) {
      phoneNumber = cardData.phone.replace(/\D/g, '');
      if (phoneNumber.length >= 10) {
        console.log('[OrderService] ✅ Telefone do cardData será usado:', phoneNumber.substring(0, 2) + '****' + phoneNumber.substring(phoneNumber.length - 4));
        customerData.phoneNumbers = [phoneNumber];
      } else {
        console.warn('[OrderService] ⚠️  Telefone do cardData inválido (menos de 10 dígitos), tentando fallback');
        phoneNumber = '';
      }
    }
    
    // Fallback: Telefone do perfil do usuário
    if (!phoneNumber || phoneNumber.length < 10) {
      const phoneContact = orderWithUser.user.person.contacts?.find(
        (contact: any) => (contact.type === 'phone' || contact.type === 'whatsapp') && !contact.deletedAt
      );
      
      if (phoneContact?.value) {
        phoneNumber = phoneContact.value.replace(/\D/g, '');
        if (phoneNumber.length >= 10) {
          console.log('[OrderService] ℹ️  Usando telefone do perfil do usuário');
          customerData.phoneNumbers = [phoneNumber];
        }
      }
    }
    
    // Se ainda não houver telefone válido, usar telefone padrão
    if (!phoneNumber || phoneNumber.length < 10) {
      console.warn('[OrderService] ⚠️  Telefone não encontrado. Usando telefone padrão.');
      customerData.phoneNumbers = ['11999999999']; // Telefone padrão (11 99999-9999)
    }

    // Converter total para centavos
    const amountInCents = Math.round(parseFloat(orderWithUser.total.toString()) * 100);

    // Preparar itens da transação
    const transactionItems = orderWithUser.items.map((item: any) => ({
      id: item.id,
      title: item.product.name,
      unitPrice: Math.round(parseFloat(item.unitPrice.toString()) * 100),
      quantity: item.quantity,
      tangible: true,
      code: item.product.sku || item.product.id || item.id, // Código obrigatório para API v5
    }));

    // Calcular split de pagamento automaticamente (gerenciado pelo backend)
    const paymentSplit = await paymentSplitService.calculateSplit(orderWithUser);

    // Criar transação no Pagarme
    let pagarmeTransaction;
    try {
      pagarmeTransaction = await createCreditCardTransaction({
        amount: amountInCents,
        cardData,
        customer: customerData,
        billing: {
          name: customerData.name,
          address: billingAddress,
        },
        items: transactionItems,
        metadata: {
          orderId: order.id,
          userId: orderWithUser.userId,
        },
        ...(paymentSplit && paymentSplit.length > 0 && { split: paymentSplit }),
      });
    } catch (error: any) {
      // Re-throw com mensagem mais clara
      if (error.message && error.message.includes('autenticação') || error.message.includes('401')) {
        throw new Error(`Erro ao processar pagamento: ${error.message}`);
      }
      throw error;
    }

    // Verificar status da transação/charge
    // A API v5 retorna Order com charges, então precisamos verificar o status do charge
    const transactionStatus = pagarmeTransaction.status;
    let paymentStatus = 'pending';

    console.log('[OrderService] Status recebido da Pagarme:', transactionStatus);

    // Status possíveis na API v5: paid, pending, canceled, failed
    // Status possíveis na API v1 (legada): paid, authorized, refused, processing
    // Compatibilidade com ambos formatos
    if (transactionStatus === 'paid' || transactionStatus === 'authorized' || transactionStatus === 'success') {
      paymentStatus = 'paid';
      console.log('[OrderService] ✅ Pagamento aprovado, status:', paymentStatus);
    } else if (transactionStatus === 'refused' || transactionStatus === 'failed' || transactionStatus === 'canceled') {
      paymentStatus = 'failed';
      console.log('[OrderService] ❌ Pagamento recusado, status:', transactionStatus);
      
      // Extrair mensagem de erro da transação se disponível
      const transactionData = pagarmeTransaction as any;
      const errorMessage = transactionData?.message || 
                          transactionData?.gateway_response?.message ||
                          transactionData?.gateway_response?.code ||
                          transactionData?.gateway_response?.acquirer_message ||
                          `Status: ${transactionStatus}`;
      
      console.error('[OrderService] Detalhes do erro:', {
        transactionId: pagarmeTransaction.id,
        status: transactionStatus,
        errorMessage: errorMessage,
        gatewayResponse: transactionData?.gateway_response,
        fullTransaction: JSON.stringify(transactionData, null, 2),
      });
      
      // Atualizar pedido com status failed antes de lançar erro
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'failed',
          paymentTransactionId: pagarmeTransaction.id?.toString() || String(pagarmeTransaction.id),
        },
      });
      
      throw new Error(`Pagamento recusado pela Pagarme. ${errorMessage}`);
    } else if (transactionStatus === 'processing' || transactionStatus === 'pending' || transactionStatus === 'waiting_payment') {
      paymentStatus = 'pending';
      console.log('[OrderService] ⏳ Pagamento pendente, status:', paymentStatus);
    } else {
      paymentStatus = 'failed';
      console.warn('[OrderService] ⚠️  Status desconhecido:', transactionStatus);
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'failed',
          paymentTransactionId: pagarmeTransaction.id?.toString() || String(pagarmeTransaction.id),
        },
      });
      throw new Error(`Status de transação desconhecido: ${transactionStatus}`);
    }

    // Atualizar pedido com informações do pagamento
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus,
        paymentMethod: 'credit_card',
        paymentTransactionId: pagarmeTransaction.id.toString(),
      },
    });
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

  async validateCartItems(items: OrderItemInput[]): Promise<ValidateCartItemsResponse> {
    const validItems: OrderItemInput[] = [];
    const invalidItems: CartItemValidation[] = [];

    for (const item of items) {
      const validation: CartItemValidation = {
        productId: item.productId,
        valid: false,
        requestedQuantity: item.quantity,
      };

      try {
        const product = await productService.findById(item.productId);

        if (!product) {
          validation.reason = 'not_found';
          invalidItems.push(validation);
          continue;
        }

        if (product.status !== 'active') {
          validation.reason = 'inactive';
          invalidItems.push(validation);
          continue;
        }

        if (product.externalUrl) {
          validation.reason = 'external_url';
          invalidItems.push(validation);
          continue;
        }

        if (product.price === null || product.price === undefined) {
          validation.reason = 'no_price';
          invalidItems.push(validation);
          continue;
        }

        const availableQuantity = product.quantity ?? 0;

        if (availableQuantity === 0) {
          validation.reason = 'out_of_stock';
          validation.availableQuantity = 0;
          invalidItems.push(validation);
          continue;
        }

        if (availableQuantity < item.quantity) {
          validation.reason = 'insufficient_stock';
          validation.availableQuantity = availableQuantity;
          invalidItems.push(validation);
          continue;
        }

        validation.valid = true;
        validItems.push(item);
      } catch (error) {
        validation.reason = 'not_found';
        invalidItems.push(validation);
      }
    }

    return {
      validItems,
      invalidItems,
    };
  }
}

export const orderService = new OrderService();
