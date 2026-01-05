import type { PaymentSplit } from '@/interfaces/payment/payment';
import { config } from '@/config';
import type { Order } from '@prisma/client';

export class PaymentSplitService {
  async calculateSplit(order: Order): Promise<PaymentSplit[] | null> {
    const splitEnabled = this.isSplitEnabled();
    
    if (!splitEnabled) {
      return null;
    }

    const splitConfig = this.getSplitConfig();
    
    if (!splitConfig || !splitConfig.recipientId) {
      console.log('[PaymentSplitService] Split desabilitado ou não configurado');
      return null;
    }

    const split = this.calculateSplitAmount(order, splitConfig);
    
    if (!split || split.length === 0) {
      return null;
    }

    console.log('[PaymentSplitService] Split calculado:', {
      splitsCount: split.length,
      totalPercentage: split.reduce((sum, s) => sum + (s.type === 'percentage' ? s.amount : 0), 0),
    });

    return split;
  }

  private isSplitEnabled(): boolean {
    const enabled = process.env.PAGARME_SPLIT_ENABLED === 'true';
    return enabled;
  }

  private getSplitConfig(): {
    recipientId: string;
    percentage: number;
    chargeProcessingFee: boolean;
    chargeRemainderFee: boolean;
    liable: boolean;
  } | null {
    const recipientId = process.env.PAGARME_SPLIT_RECIPIENT_ID;
    
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

