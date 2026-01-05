import type {
  CreditCardData,
  CustomerData,
  AddressData,
  TransactionItem,
  PaymentSplit,
  IndividualRecipientData,
  CorporationRecipientData,
  RecipientPhoneNumber,
  RecipientAddress,
  DefaultBankAccount,
  TransferSettings,
  AutomaticAnticipationSettings,
} from '@/interfaces/payment/payment';

describe('Pagarme Client - Data Formats Documentation', () => {
  describe('CreditCardData', () => {
    it('cardExpirationDate deve estar no formato MMYY (4 dígitos)', () => {
      const validCardData: CreditCardData = {
        cardNumber: '4111111111111111',
        cardHolderName: 'Tony Stark',
        cardExpirationDate: '1225',
        cardCvv: '123',
      };

      expect(validCardData.cardExpirationDate).toMatch(/^\d{4}$/);
      expect(validCardData.cardExpirationDate.substring(0, 2)).toBe('12');
      expect(validCardData.cardExpirationDate.substring(2, 4)).toBe('25');
    });

    it('cardNumber deve conter apenas dígitos (espaços serão removidos)', () => {
      const cardData: CreditCardData = {
        cardNumber: '4111 1111 1111 1111',
        cardHolderName: 'Tony Stark',
        cardExpirationDate: '1225',
        cardCvv: '123',
      };

      const cleaned = cardData.cardNumber.replace(/\s/g, '');
      expect(cleaned).toMatch(/^\d+$/);
      expect(cleaned.length).toBeGreaterThanOrEqual(13);
    });
  });

  describe('TransactionItem - Valores em Centavos', () => {
    it('unitPrice deve estar em centavos (não em reais)', () => {
      const item: TransactionItem = {
        id: 'item-1',
        title: 'Produto Teste',
        unitPrice: 9999,
        quantity: 1,
      };

      expect(item.unitPrice).toBe(9999);
      expect(item.unitPrice / 100).toBe(99.99);
    });

    it('exemplo: produto de R$ 50,00 deve ser enviado como 5000 centavos', () => {
      const productPriceInReais = 50.00;
      const item: TransactionItem = {
        id: 'item-1',
        title: 'Produto R$ 50,00',
        unitPrice: Math.round(productPriceInReais * 100),
        quantity: 1,
      };

      expect(item.unitPrice).toBe(5000);
    });

    it('exemplo: produto de R$ 199,99 deve ser enviado como 19999 centavos', () => {
      const productPriceInReais = 199.99;
      const item: TransactionItem = {
        id: 'item-1',
        title: 'Produto R$ 199,99',
        unitPrice: Math.round(productPriceInReais * 100),
        quantity: 1,
      };

      expect(item.unitPrice).toBe(19999);
    });
  });

  describe('createCreditCardTransaction - amount em centavos', () => {
    it('amount deve estar em centavos, não em reais', () => {
      const orderTotalInReais = 150.50;
      const amountInCents = Math.round(orderTotalInReais * 100);

      expect(amountInCents).toBe(15050);
    });

    it('exemplo: pedido de R$ 1.000,00 deve ser enviado como 100000 centavos', () => {
      const orderTotal = 1000.00;
      const amountInCents = Math.round(orderTotal * 100);

      expect(amountInCents).toBe(100000);
    });
  });

  describe('PaymentSplit - amount pode ser percentual ou valor fixo', () => {
    it('quando type é "percentage", amount é um número de 0 a 100', () => {
      const split: PaymentSplit = {
        type: 'percentage',
        amount: 50,
        recipient_id: 'rp_123',
      };

      expect(split.type).toBe('percentage');
      expect(split.amount).toBeGreaterThanOrEqual(0);
      expect(split.amount).toBeLessThanOrEqual(100);
      expect(split.amount / 100).toBe(0.5);
    });

    it('quando type é "flat", amount está em centavos', () => {
      const split: PaymentSplit = {
        type: 'flat',
        amount: 5000,
        recipient_id: 'rp_123',
      };

      expect(split.type).toBe('flat');
      expect(split.amount).toBe(5000);
      expect(split.amount / 100).toBe(50.00);
    });

    it('exemplo: split de 30% para recebedor', () => {
      const split: PaymentSplit = {
        type: 'percentage',
        amount: 30,
        recipient_id: 'rp_abc123',
        options: {
          charge_processing_fee: true,
          charge_remainder_fee: false,
          liable: true,
        },
      };

      expect(split.amount).toBe(30);
    });
  });

  describe('CustomerData - birthday format', () => {
    it('birthday deve estar no formato YYYY-MM-DD', () => {
      const customer: CustomerData = {
        externalId: 'user-123',
        name: 'Tony Stark',
        email: 'tony@avengers.com',
        birthday: '1990-05-15',
      };

      expect(customer.birthday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('IndividualRecipientData - Formatos de Data', () => {
    it('birthdate deve estar no formato DD/MM/YYYY', () => {
      const recipient: IndividualRecipientData = {
        register_information: {
          phone_numbers: [],
          address: {
            street: 'Rua Test',
            street_number: '123',
            complementary: '',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zip_code: '01234567',
            reference_point: '',
          },
          name: 'Tony Stark',
          email: 'tony@avengers.com',
          document: '12345678900',
          type: 'individual',
          mother_name: 'Maria Stark',
          birthdate: '15/05/1990',
          monthly_income: 5000,
          professional_occupation: 'Engenheiro',
        },
        default_bank_account: {
          holder_name: 'Tony Stark',
          holder_type: 'individual',
          holder_document: '12345678900',
          bank: '341',
          branch_number: '1234',
          branch_check_digit: '6',
          account_number: '12345',
          account_check_digit: '6',
          type: 'checking',
        },
        transfer_settings: {
          transfer_enabled: false,
        },
      };

      expect(recipient.register_information.birthdate).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });

    it('monthly_income deve estar em centavos', () => {
      const incomeInReais = 5000.00;
      const recipient: IndividualRecipientData = {
        register_information: {
          phone_numbers: [],
          address: {
            street: 'Rua Test',
            street_number: '123',
            complementary: '',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zip_code: '01234567',
            reference_point: '',
          },
          name: 'Tony Stark',
          email: 'tony@avengers.com',
          document: '12345678900',
          type: 'individual',
          mother_name: 'Maria Stark',
          birthdate: '15/05/1990',
          monthly_income: Math.round(incomeInReais * 100),
          professional_occupation: 'Engenheiro',
        },
        default_bank_account: {
          holder_name: 'Tony Stark',
          holder_type: 'individual',
          holder_document: '12345678900',
          bank: '341',
          branch_number: '1234',
          branch_check_digit: '6',
          account_number: '12345',
          account_check_digit: '6',
          type: 'checking',
        },
        transfer_settings: {
          transfer_enabled: false,
        },
      };

      expect(recipient.register_information.monthly_income).toBe(500000);
    });
  });

  describe('CorporationRecipientData - Formatos de Data', () => {
    it('founding_date deve estar no formato YYYY-MM-DD', () => {
      const recipient: CorporationRecipientData = {
        register_information: {
          phone_numbers: [],
          main_address: {
            street: 'Av. Test',
            street_number: '456',
            complementary: '',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zip_code: '01234567',
            reference_point: '',
          },
          managing_partners: [],
          company_name: 'Empresa LTDA',
          trading_name: 'Empresa',
          email: 'empresa@test.com',
          document: '12345678000190',
          type: 'corporation',
          annual_revenue: 1000000,
          corporation_type: 'LTDA',
          founding_date: '2010-10-30',
        },
        default_bank_account: {
          holder_name: 'Empresa LTDA',
          holder_type: 'corporation',
          holder_document: '12345678000190',
          bank: '341',
          branch_number: '1234',
          branch_check_digit: '6',
          account_number: '12345',
          account_check_digit: '6',
          type: 'checking',
        },
        transfer_settings: {
          transfer_enabled: false,
        },
      };

      expect(recipient.register_information.founding_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('annual_revenue deve estar em centavos', () => {
      const revenueInReais = 1000000.00;
      const recipient: CorporationRecipientData = {
        register_information: {
          phone_numbers: [],
          main_address: {
            street: 'Av. Test',
            street_number: '456',
            complementary: '',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zip_code: '01234567',
            reference_point: '',
          },
          managing_partners: [],
          company_name: 'Empresa LTDA',
          trading_name: 'Empresa',
          email: 'empresa@test.com',
          document: '12345678000190',
          type: 'corporation',
          annual_revenue: Math.round(revenueInReais * 100),
          corporation_type: 'LTDA',
          founding_date: '2010-10-30',
        },
        default_bank_account: {
          holder_name: 'Empresa LTDA',
          holder_type: 'corporation',
          holder_document: '12345678000190',
          bank: '341',
          branch_number: '1234',
          branch_check_digit: '6',
          account_number: '12345',
          account_check_digit: '6',
          type: 'checking',
        },
        transfer_settings: {
          transfer_enabled: false,
        },
      };

      expect(recipient.register_information.annual_revenue).toBe(100000000);
    });
  });

  describe('ManagingPartner - birthdate format', () => {
    it('birthdate do sócio deve estar no formato DD/MM/YYYY', () => {
      const partner = {
        self_declared_legal_representative: true,
        address: {
          street: 'Rua Test',
          street_number: '123',
          complementary: '',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zip_code: '01234567',
          reference_point: '',
        },
        phone_numbers: [],
        name: 'Tony Stark',
        email: 'tony@avengers.com',
        document: '12345678900',
        type: 'individual' as const,
        mother_name: 'Maria Stark',
        birthdate: '15/05/1990',
        monthly_income: 500000,
        professional_occupation: 'Engenheiro',
      };

      expect(partner.birthdate).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });
  });

  describe('RecipientPhoneNumber - Formato brasileiro', () => {
    it('ddd deve ter 2 dígitos e number deve ter 8 ou 9 dígitos', () => {
      const phone: RecipientPhoneNumber = {
        ddd: '21',
        number: '994647568',
        type: 'mobile',
      };

      expect(phone.ddd).toMatch(/^\d{2}$/);
      expect(phone.number.length).toBeGreaterThanOrEqual(8);
      expect(phone.number.length).toBeLessThanOrEqual(9);
    });
  });

  describe('TransferSettings - transfer_enabled pode ser boolean ou string', () => {
    it('aceita boolean false', () => {
      const settings: TransferSettings = {
        transfer_enabled: false,
        transfer_interval: 'Daily',
        transfer_day: 0,
      };

      expect(typeof settings.transfer_enabled).toBe('boolean');
    });

    it('aceita string "false" (conforme API Pagarme)', () => {
      const settings: TransferSettings = {
        transfer_enabled: 'false',
        transfer_interval: 'Daily',
        transfer_day: 0,
      };

      expect(settings.transfer_enabled).toBe('false');
    });
  });

  describe('AutomaticAnticipationSettings - volume_percentage pode ser number ou string', () => {
    it('aceita number de 0 a 100', () => {
      const settings: AutomaticAnticipationSettings = {
        enabled: true,
        type: 'full',
        volume_percentage: 50,
        delay: null,
      };

      expect(typeof settings.volume_percentage).toBe('number');
      expect(settings.volume_percentage).toBeGreaterThanOrEqual(0);
      expect(settings.volume_percentage).toBeLessThanOrEqual(100);
    });

    it('aceita string "50" (conforme API Pagarme)', () => {
      const settings: AutomaticAnticipationSettings = {
        enabled: true,
        type: 'full',
        volume_percentage: '50',
        delay: 'null',
      };

      expect(settings.volume_percentage).toBe('50');
    });
  });
});

