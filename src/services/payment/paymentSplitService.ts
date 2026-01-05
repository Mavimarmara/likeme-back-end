import type { PaymentSplit } from '@/interfaces/payment/payment';
import { config } from '@/config';
import type { Order } from '@prisma/client';
import prisma from '@/config/database';

export class PaymentSplitService {
  async calculateSplit(order: Order): Promise<PaymentSplit[] | null> {
    const splitEnabled = this.isSplitEnabled();
    
    console.log('[PaymentSplitService] Verificando split. Habilitado:', splitEnabled);
    
    if (!splitEnabled) {
      console.log('[PaymentSplitService] Split desabilitado via PAGARME_SPLIT_ENABLED');
      return null;
    }

    const splitConfig = await this.getSplitConfig();
    
    if (!splitConfig || !splitConfig.recipientId) {
      console.log('[PaymentSplitService] Split desabilitado ou não configurado. Recipient ID não encontrado.');
      return null;
    }

    console.log('[PaymentSplitService] Configuração de split encontrada:', {
      recipientId: splitConfig.recipientId.substring(0, 20) + '...',
      percentage: splitConfig.percentage,
    });

    const split = this.calculateSplitAmount(order, splitConfig);
    
    if (!split || split.length === 0) {
      console.log('[PaymentSplitService] Split calculado está vazio');
      return null;
    }

    console.log('[PaymentSplitService] Split calculado:', {
      splitsCount: split.length,
      totalPercentage: split.reduce((sum, s) => sum + (s.type === 'percentage' ? s.amount : 0), 0),
      recipientIds: split.map(s => s.recipient_id.substring(0, 20) + '...'),
    });

    return split;
  }

  private isSplitEnabled(): boolean {
    const enabled = process.env.PAGARME_SPLIT_ENABLED === 'true';
    return enabled;
  }

  private async getSplitConfig(): Promise<{
    recipientId: string;
    percentage: number;
    chargeProcessingFee: boolean;
    chargeRemainderFee: boolean;
    liable: boolean;
  } | null> {
    let recipientId = process.env.PAGARME_SPLIT_RECIPIENT_ID;

    if (!recipientId) {
      const defaultRecipient = await prisma.pagarmeRecipient.findFirst({
        where: {
          isDefault: true,
          deletedAt: null,
        },
      });

      if (defaultRecipient) {
        recipientId = defaultRecipient.recipientId;
      }
    }

    if (!recipientId) {
      return null;
    }

    const percentage = parseFloat(process.env.PAGARME_SPLIT_PERCENTAGE || '0');
    
    if (percentage <= 0 || percentage > 100) {
      console.warn('[PaymentSplitService] Percentual de split inválido:', percentage);
      return null;
    }

    return {
      recipientId,
      percentage,
      chargeProcessingFee: process.env.PAGARME_SPLIT_CHARGE_PROCESSING_FEE === 'true',
      chargeRemainderFee: process.env.PAGARME_SPLIT_CHARGE_REMAINDER_FEE === 'true',
      liable: process.env.PAGARME_SPLIT_LIABLE === 'true',
    };
  }

  private calculateSplitAmount(
    order: Order,
    config: {
      recipientId: string;
      percentage: number;
      chargeProcessingFee: boolean;
      chargeRemainderFee: boolean;
      liable: boolean;
    }
  ): PaymentSplit[] {
    const splits: PaymentSplit[] = [];

    splits.push({
      type: 'percentage',
      amount: config.percentage,
      recipient_id: config.recipientId,
      options: {
        charge_processing_fee: config.chargeProcessingFee,
        charge_remainder_fee: config.chargeRemainderFee,
        liable: config.liable,
      },
    });

    return splits;
  }

  async calculateComplexSplit(order: Order & { items?: any[] }): Promise<PaymentSplit[] | null> {
    return this.calculateSplit(order);
  }
}

export const paymentSplitService = new PaymentSplitService();

