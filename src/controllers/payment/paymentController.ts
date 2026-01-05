import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import prisma from '@/config/database';
import { sendSuccess, sendError } from '@/utils/response';
import { Decimal } from '@prisma/client/runtime/library';
import {
  createCreditCardTransaction,
  getTransaction,
  captureTransaction,
  refundTransaction,
  CustomerData,
  AddressData,
  CreditCardData,
} from '@/clients/pagarme/pagarmeClient';
import { paymentSplitService } from '@/services/payment/paymentSplitService';

/**
 * Processa pagamento de um pedido usando Pagarme
 */
export const processPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orderId, cardData, billingAddress } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    if (!orderId) {
      sendError(res, 'Order ID is required', 400);
      return;
    }

    // Buscar o pedido
    const order = await prisma.order.findUnique({
      where: { id: orderId },
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

    if (!order || order.deletedAt) {
      sendError(res, 'Order not found', 404);
      return;
    }

    // Verificar se o pedido pertence ao usuário
    if (order.userId !== userId) {
      sendError(res, 'Not authorized to process payment for this order', 403);
      return;
    }

    // Verificar se o pedido já foi pago
    if (order.paymentStatus === 'paid') {
      sendError(res, 'Order already paid', 400);
      return;
    }

    // Buscar email do usuário
    const emailContact = order.user.person.contacts?.find(
      (contact: any) => contact.type === 'email' && !contact.deletedAt
    );
    const email = emailContact?.value || '';

    if (!email) {
      sendError(res, 'User email not found', 400);
      return;
    }

    // Preparar dados do cliente
    const customerData: CustomerData = {
      externalId: userId,
      name: `${order.user.person.firstName} ${order.user.person.lastName}`,
      email,
      type: 'individual',
      country: 'br',
    };

    // Buscar CPF - OBRIGATÓRIO para Pagarme (tipo individual)
    // CPF deve estar no campo nationalRegistration da Person
    const cpf = order.user.person.nationalRegistration?.replace(/\D/g, '') || '';
    
    if (!cpf || cpf.length < 11) {
      sendError(res, 'CPF do cliente é obrigatório para processar pagamentos. Por favor, adicione o CPF no perfil do usuário.', 400);
      return;
    }
    
    customerData.documents = [
      {
        type: 'cpf',
        number: cpf,
      },
    ];

    // Buscar telefone se disponível
    const phoneContact = order.user.person.contacts?.find(
      (contact: any) => (contact.type === 'phone' || contact.type === 'whatsapp') && !contact.deletedAt
    );
    if (phoneContact?.value) {
      customerData.phoneNumbers = [phoneContact.value];
    }

    // Converter total para centavos
    const amountInCents = Math.round(
      parseFloat(order.total.toString()) * 100
    );

    // Preparar itens da transação
    const transactionItems = order.items.map((item: any) => ({
      id: item.id,
      title: item.product.name,
      unitPrice: Math.round(parseFloat(item.unitPrice.toString()) * 100),
      quantity: item.quantity,
      tangible: true,
    }));

    // Validar dados do cartão
    if (!cardData || !cardData.cardNumber || !cardData.cardHolderName || 
        !cardData.cardExpirationDate || !cardData.cardCvv) {
      sendError(res, 'Card data is required', 400);
      return;
    }

    // Validar endereço de cobrança
    if (!billingAddress || !billingAddress.street || !billingAddress.city || 
        !billingAddress.state || !billingAddress.zipcode) {
      sendError(res, 'Billing address is required', 400);
      return;
    }

    // Calcular split de pagamento automaticamente (gerenciado pelo backend)
    const paymentSplit = await paymentSplitService.calculateSplit(order);

    // Criar transação no Pagarme
    let pagarmeTransaction;
    try {
      pagarmeTransaction = await createCreditCardTransaction({
        amount: amountInCents,
        cardData: cardData as CreditCardData,
        customer: customerData,
        billing: {
          name: customerData.name,
          address: billingAddress as AddressData,
        },
        items: transactionItems,
        metadata: {
          orderId: order.id,
          userId: userId,
        },
        ...(paymentSplit && paymentSplit.length > 0 && { split: paymentSplit }),
      });
    } catch (error: any) {
      console.error('Pagarme transaction error:', error);
      
      // Atualizar status do pedido para failed
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'failed' },
      });

      sendError(
        res,
        `Erro ao processar pagamento: ${error.message || 'Erro desconhecido'}`,
        400
      );
      return;
    }

    // Verificar status da transação
    const transactionStatus = pagarmeTransaction.status;
    let paymentStatus = 'pending';

    if (transactionStatus === 'paid' || transactionStatus === 'authorized') {
      paymentStatus = 'paid';
    } else if (transactionStatus === 'refused' || transactionStatus === 'processing') {
      paymentStatus = 'failed';
    }

    // Atualizar pedido com informações do pagamento
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus,
        paymentMethod: 'credit_card',
        paymentTransactionId: pagarmeTransaction.id.toString(),
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

    sendSuccess(
      res,
      {
        order: updatedOrder,
        transaction: {
          id: pagarmeTransaction.id,
          status: pagarmeTransaction.status,
          authorizationCode: pagarmeTransaction.authorization_code,
        },
      },
      'Payment processed successfully'
    );
  } catch (error) {
    console.error('Process payment error:', error);
    sendError(res, 'Erro ao processar pagamento');
  }
};

/**
 * Busca status de uma transação Pagarme
 */
export const getPaymentStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const transactionId = req.params.transactionId || req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    // Verificar se o usuário tem permissão para ver esta transação (via pedido relacionado)
    const order = await prisma.order.findFirst({
      where: {
        paymentTransactionId: transactionId,
        userId,
        deletedAt: null,
      },
    });

    // Se não encontrar pelo transactionId, permitir busca direta (mas validar depois)
    try {
      const transaction = await getTransaction(transactionId);
      
      // Se encontramos um pedido, confirmar que pertence ao usuário
      if (order && order.userId !== userId) {
        sendError(res, 'Not authorized to view this transaction', 403);
        return;
      }
      
      sendSuccess(res, {
        id: transaction.id.toString(),
        status: transaction.status,
        amount: transaction.amount / 100, // converter de centavos para reais
        authorizationCode: transaction.authorization_code,
        orderId: order?.id || null,
      }, 'Transaction status retrieved successfully');
    } catch (error: any) {
      sendError(res, `Transaction not found: ${error.message}`, 404);
    }
  } catch (error) {
    console.error('Get payment status error:', error);
    sendError(res, 'Erro ao obter status do pagamento');
  }
};

/**
 * Captura uma transação autorizada
 */
export const capturePayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const transactionId = req.params.transactionId || req.params.id;
    const { amount } = req.body; // opcional, para captura parcial
    const userId = req.user?.id;

    if (!userId) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    try {
      const transaction = await captureTransaction(
        transactionId,
        amount ? Math.round(amount * 100) : undefined // converter para centavos se fornecido
      );

      sendSuccess(res, {
        id: transaction.id,
        status: transaction.status,
      }, 'Payment captured successfully');
    } catch (error: any) {
      sendError(res, `Error capturing transaction: ${error.message}`, 400);
    }
  } catch (error) {
    console.error('Capture payment error:', error);
    sendError(res, 'Erro ao capturar pagamento');
  }
};

/**
 * Estorna um pagamento
 */
export const refundPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const transactionId = req.params.transactionId || req.params.id;
    const { amount } = req.body; // opcional, para estorno parcial
    const userId = req.user?.id;

    if (!userId) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    // Buscar pedido relacionado à transação
    const order = await prisma.order.findFirst({
      where: {
        paymentTransactionId: transactionId,
        userId,
        deletedAt: null,
      },
    });

    try {
      const transaction = await refundTransaction(
        transactionId,
        amount ? Math.round(amount * 100) : undefined // converter para centavos se fornecido
      );

      // Atualizar status do pedido para refunded se encontramos o pedido
      if (order) {
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'refunded' },
        });
      }

      sendSuccess(res, {
        id: transaction.id,
        status: transaction.status,
        orderId: order?.id || null,
      }, 'Payment refunded successfully');
    } catch (error: any) {
      sendError(res, `Error refunding transaction: ${error.message}`, 400);
    }
  } catch (error) {
    console.error('Refund payment error:', error);
    sendError(res, 'Erro ao estornar pagamento');
  }
};
