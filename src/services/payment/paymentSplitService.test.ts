import { paymentSplitService } from '@/services/payment/paymentSplitService';
import type { Order } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('PaymentSplitService - Documentação de Regras de Negócio', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('calculateSplit - Configuração via variáveis de ambiente', () => {
    it('retorna null quando split não está habilitado', async () => {
      process.env.PAGARME_SPLIT_ENABLED = 'false';

      const order = {
        id: 'order-123',
        total: new Decimal(100.00),
      } as Order;

      const result = await paymentSplitService.calculateSplit(order);

      expect(result).toBeNull();
    });

    it('retorna null quando recipient_id não está configurado', async () => {
      process.env.PAGARME_SPLIT_ENABLED = 'true';
      delete process.env.PAGARME_SPLIT_RECIPIENT_ID;

      const order = {
        id: 'order-123',
        total: new Decimal(100.00),
      } as Order;

      const result = await paymentSplitService.calculateSplit(order);

      expect(result).toBeNull();
    });

    it('retorna null quando percentage é inválido (<= 0 ou > 100)', async () => {
      process.env.PAGARME_SPLIT_ENABLED = 'true';
      process.env.PAGARME_SPLIT_RECIPIENT_ID = 'rp_123';
      process.env.PAGARME_SPLIT_PERCENTAGE = '0';

      const order = {
        id: 'order-123',
        total: new Decimal(100.00),
      } as Order;

      const result = await paymentSplitService.calculateSplit(order);

      expect(result).toBeNull();
    });

    it('cria split com percentual configurado quando habilitado', async () => {
      process.env.PAGARME_SPLIT_ENABLED = 'true';
      process.env.PAGARME_SPLIT_RECIPIENT_ID = 'rp_abc123';
      process.env.PAGARME_SPLIT_PERCENTAGE = '50';
      process.env.PAGARME_SPLIT_CHARGE_PROCESSING_FEE = 'true';
      process.env.PAGARME_SPLIT_CHARGE_REMAINDER_FEE = 'true';
      process.env.PAGARME_SPLIT_LIABLE = 'true';

      const order = {
        id: 'order-123',
        total: new Decimal(100.00),
      } as Order;

      const result = await paymentSplitService.calculateSplit(order);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0]).toMatchObject({
        type: 'percentage',
        amount: 50,
        recipient_id: 'rp_abc123',
        options: {
          charge_processing_fee: true,
          charge_remainder_fee: true,
          liable: true,
        },
      });
    });

    it('split de 50% significa que o recebedor recebe metade do valor', async () => {
      process.env.PAGARME_SPLIT_ENABLED = 'true';
      process.env.PAGARME_SPLIT_RECIPIENT_ID = 'rp_123';
      process.env.PAGARME_SPLIT_PERCENTAGE = '50';
      process.env.PAGARME_SPLIT_CHARGE_PROCESSING_FEE = 'false';
      process.env.PAGARME_SPLIT_CHARGE_REMAINDER_FEE = 'false';
      process.env.PAGARME_SPLIT_LIABLE = 'false';

      const order = {
        id: 'order-123',
        total: new Decimal(1000.00),
      } as Order;

      const result = await paymentSplitService.calculateSplit(order);

      expect(result![0].amount).toBe(50);
      expect(result![0].type).toBe('percentage');
    });

    it('split de 30% significa que o recebedor recebe 30% do valor', async () => {
      process.env.PAGARME_SPLIT_ENABLED = 'true';
      process.env.PAGARME_SPLIT_RECIPIENT_ID = 'rp_123';
      process.env.PAGARME_SPLIT_PERCENTAGE = '30';

      const order = {
        id: 'order-123',
        total: new Decimal(1000.00),
      } as Order;

      const result = await paymentSplitService.calculateSplit(order);

      expect(result![0].amount).toBe(30);
    });

    it('quando split é menor que 100%, o restante fica com a conta principal automaticamente', async () => {
      process.env.PAGARME_SPLIT_ENABLED = 'true';
      process.env.PAGARME_SPLIT_RECIPIENT_ID = 'rp_123';
      process.env.PAGARME_SPLIT_PERCENTAGE = '30';

      const order = {
        id: 'order-123',
        total: new Decimal(1000.00),
      } as Order;

      const result = await paymentSplitService.calculateSplit(order);

      expect(result).toHaveLength(1);
      expect(result![0].amount).toBe(30);
    });
  });

  describe('calculateSplit - Opções de split', () => {
    it('charge_processing_fee: true significa que o recebedor paga a taxa de processamento', async () => {
      process.env.PAGARME_SPLIT_ENABLED = 'true';
      process.env.PAGARME_SPLIT_RECIPIENT_ID = 'rp_123';
      process.env.PAGARME_SPLIT_PERCENTAGE = '50';
      process.env.PAGARME_SPLIT_CHARGE_PROCESSING_FEE = 'true';

      const order = {
        id: 'order-123',
        total: new Decimal(100.00),
      } as Order;

      const result = await paymentSplitService.calculateSplit(order);

      expect(result![0].options?.charge_processing_fee).toBe(true);
    });

    it('liable: true significa que o recebedor é responsável por estornos', async () => {
      process.env.PAGARME_SPLIT_ENABLED = 'true';
      process.env.PAGARME_SPLIT_RECIPIENT_ID = 'rp_123';
      process.env.PAGARME_SPLIT_PERCENTAGE = '50';
      process.env.PAGARME_SPLIT_LIABLE = 'true';

      const order = {
        id: 'order-123',
        total: new Decimal(100.00),
      } as Order;

      const result = await paymentSplitService.calculateSplit(order);

      expect(result![0].options?.liable).toBe(true);
    });
  });

  describe('calculateComplexSplit - Extensibilidade futura', () => {
    it('por padrão usa a lógica simples de calculateSplit', async () => {
      process.env.PAGARME_SPLIT_ENABLED = 'true';
      process.env.PAGARME_SPLIT_RECIPIENT_ID = 'rp_123';
      process.env.PAGARME_SPLIT_PERCENTAGE = '50';

      const order = {
        id: 'order-123',
        total: new Decimal(100.00),
      } as Order & { items?: any[] };

      const simpleResult = await paymentSplitService.calculateSplit(order);
      const complexResult = await paymentSplitService.calculateComplexSplit(order);

      expect(complexResult).toEqual(simpleResult);
    });

    it('pode ser expandido no futuro para splits baseados em produtos', async () => {
      const order = {
        id: 'order-123',
        total: new Decimal(100.00),
        items: [
          { productId: 'prod-1', quantity: 1 },
          { productId: 'prod-2', quantity: 2 },
        ],
      } as Order & { items?: any[] };

      const result = await paymentSplitService.calculateComplexSplit(order);

      expect(result).toBeDefined();
    });
  });
});

