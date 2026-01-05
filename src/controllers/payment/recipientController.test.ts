import type {
  IndividualRecipientData,
  CorporationRecipientData,
} from '@/interfaces/payment/payment';

describe('Recipient Controller - Formatos de Dados', () => {
  describe('IndividualRecipientData - Estrutura e Formatos', () => {
    it('address (não main_address) é usado para pessoa física', () => {
      const recipient: IndividualRecipientData = {
        register_information: {
          phone_numbers: [
            {
              ddd: '21',
              number: '994647568',
              type: 'mobile',
            },
          ],
          address: {
            street: 'Av. General Justo',
            complementary: 'Bloco A',
            street_number: '375',
            neighborhood: 'Centro',
            city: 'Rio de Janeiro',
            state: 'RJ',
            zip_code: '20021130',
            reference_point: 'Ao lado da banca de jornal',
          },
          name: 'Recebedor Pessoa fisica',
          email: 'tstark@avengers.com',
          document: '26224451990',
          type: 'individual',
          site_url: 'https://sitedorecebedor.com.br',
          mother_name: 'Nome da mae',
          birthdate: '12/10/1995',
          monthly_income: 12000000,
          professional_occupation: 'Vendedor',
        },
        default_bank_account: {
          holder_name: 'Tony Stark',
          holder_type: 'individual',
          holder_document: '26224451990',
          bank: '341',
          branch_number: '1234',
          branch_check_digit: '6',
          account_number: '12345',
          account_check_digit: '6',
          type: 'checking',
        },
        transfer_settings: {
          transfer_enabled: 'false',
          transfer_interval: 'Daily',
          transfer_day: 0,
        },
        automatic_anticipation_settings: {
          enabled: 'true',
          type: 'full',
          volume_percentage: '50',
          delay: 'null',
        },
        code: '1234',
      };

      expect(recipient.register_information).toHaveProperty('address');
      expect(recipient.register_information).not.toHaveProperty('main_address');
    });

    it('monthly_income deve estar em centavos (exemplo: R$ 120.000,00 = 12000000)', () => {
      const incomeInReais = 120000.00;
      const recipient: IndividualRecipientData = {
        register_information: {
          phone_numbers: [],
          address: {
            street: 'Av. Test',
            street_number: '123',
            neighborhood: 'Centro',
            city: 'Rio de Janeiro',
            state: 'RJ',
            zip_code: '20021130',
          },
          name: 'Test',
          email: 'test@test.com',
          document: '12345678900',
          type: 'individual',
          mother_name: 'Maria',
          birthdate: '12/10/1995',
          monthly_income: Math.round(incomeInReais * 100),
          professional_occupation: 'Vendedor',
        },
        default_bank_account: {
          holder_name: 'Test',
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

      expect(recipient.register_information.monthly_income).toBe(12000000);
    });

    it('birthdate deve estar no formato DD/MM/YYYY', () => {
      const recipient: IndividualRecipientData = {
        register_information: {
          phone_numbers: [],
          address: {
            street: 'Av. Test',
            street_number: '123',
            neighborhood: 'Centro',
            city: 'Rio de Janeiro',
            state: 'RJ',
            zip_code: '20021130',
          },
          name: 'Test',
          email: 'test@test.com',
          document: '12345678900',
          type: 'individual',
          mother_name: 'Maria',
          birthdate: '12/10/1995',
          monthly_income: 500000,
          professional_occupation: 'Vendedor',
        },
        default_bank_account: {
          holder_name: 'Test',
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
  });

  describe('CorporationRecipientData - Estrutura e Formatos', () => {
    it('main_address (não address) é usado para pessoa jurídica', () => {
      const recipient: CorporationRecipientData = {
        register_information: {
          phone_numbers: [
            {
              ddd: '21',
              number: '994647568',
              type: 'mobile',
            },
          ],
          main_address: {
            street: 'Av. General Justo',
            complementary: 'Bloco A',
            street_number: '375',
            neighborhood: 'Centro',
            city: 'Rio de Janeiro',
            state: 'RJ',
            zip_code: '20021130',
            reference_point: 'Ao lado da banca de jornal',
          },
          managing_partners: [
            {
              self_declared_legal_representative: true,
              address: {
                street: 'Av. General Justo',
                complementary: 'Bloco A',
                street_number: '375',
                neighborhood: 'Centro',
                city: 'Rio de Janeiro',
                state: 'RJ',
                zip_code: '20021130',
                reference_point: 'Ao lado da banca de jornal',
              },
              phone_numbers: [
                {
                  ddd: '27',
                  number: '999992628',
                  type: 'mobile',
                },
              ],
              name: 'Tony Stark',
              email: 'tstark@avengers.com',
              document: '26224451990',
              type: 'individual',
              mother_name: 'Nome da mae',
              birthdate: '12/10/1995',
              monthly_income: 12000000,
              professional_occupation: 'Vendedor',
            },
          ],
          company_name: 'Recebedor pessoa juridica',
          trading_name: 'Empresa LTDA',
          email: 'empresax@avengers.com',
          document: '77699131000133',
          type: 'corporation',
          site_url: 'http://www.site.com',
          annual_revenue: 100000000,
          corporation_type: 'LTDA',
          founding_date: '2010-10-30',
        },
        default_bank_account: {
          holder_name: 'Tony Stark',
          holder_type: 'individual',
          holder_document: '26224451990',
          bank: '341',
          branch_number: '1234',
          branch_check_digit: '6',
          account_number: '12345',
          account_check_digit: '6',
          type: 'checking',
        },
        transfer_settings: {
          transfer_enabled: 'false',
          transfer_interval: 'Daily',
          transfer_day: 0,
        },
        automatic_anticipation_settings: {
          enabled: 'true',
          type: 'full',
          volume_percentage: '50',
          delay: 'null',
        },
        code: '1234',
      };

      expect(recipient.register_information).toHaveProperty('main_address');
      expect(recipient.register_information).not.toHaveProperty('address');
    });

    it('founding_date deve estar no formato YYYY-MM-DD', () => {
      const recipient: CorporationRecipientData = {
        register_information: {
          phone_numbers: [],
          main_address: {
            street: 'Av. Test',
            street_number: '123',
            neighborhood: 'Centro',
            city: 'Rio de Janeiro',
            state: 'RJ',
            zip_code: '20021130',
          },
          managing_partners: [],
          company_name: 'Empresa LTDA',
          trading_name: 'Empresa',
          email: 'empresa@test.com',
          document: '12345678000190',
          type: 'corporation',
          annual_revenue: 100000000,
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

    it('annual_revenue deve estar em centavos (exemplo: R$ 1.000.000,00 = 100000000)', () => {
      const revenueInReais = 1000000.00;
      const recipient: CorporationRecipientData = {
        register_information: {
          phone_numbers: [],
          main_address: {
            street: 'Av. Test',
            street_number: '123',
            neighborhood: 'Centro',
            city: 'Rio de Janeiro',
            state: 'RJ',
            zip_code: '20021130',
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

    it('managing_partners é obrigatório e deve ter pelo menos um sócio', () => {
      const recipient: CorporationRecipientData = {
        register_information: {
          phone_numbers: [],
          main_address: {
            street: 'Av. Test',
            street_number: '123',
            neighborhood: 'Centro',
            city: 'Rio de Janeiro',
            state: 'RJ',
            zip_code: '20021130',
          },
          managing_partners: [
            {
              self_declared_legal_representative: true,
              address: {
                street: 'Av. Test',
                street_number: '123',
                neighborhood: 'Centro',
                city: 'Rio de Janeiro',
                state: 'RJ',
                zip_code: '20021130',
              },
              phone_numbers: [],
              name: 'Tony Stark',
              email: 'tony@avengers.com',
              document: '26224451990',
              type: 'individual',
              mother_name: 'Maria Stark',
              birthdate: '12/10/1995',
              monthly_income: 500000,
              professional_occupation: 'Vendedor',
            },
          ],
          company_name: 'Empresa LTDA',
          trading_name: 'Empresa',
          email: 'empresa@test.com',
          document: '12345678000190',
          type: 'corporation',
          annual_revenue: 100000000,
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

      expect(recipient.register_information.managing_partners.length).toBeGreaterThan(0);
    });
  });

  describe('TransferSettings - Valores aceitos', () => {
    it('transfer_enabled pode ser boolean false', () => {
      const settings = {
        transfer_enabled: false,
        transfer_interval: 'Daily' as const,
        transfer_day: 0,
      };

      expect(typeof settings.transfer_enabled).toBe('boolean');
    });

    it('transfer_enabled pode ser string "false" (conforme API Pagarme)', () => {
      const settings = {
        transfer_enabled: 'false' as any,
        transfer_interval: 'Daily' as const,
        transfer_day: 0,
      };

      expect(settings.transfer_enabled).toBe('false');
    });
  });

  describe('AutomaticAnticipationSettings - Valores aceitos', () => {
    it('enabled pode ser boolean true', () => {
      const settings = {
        enabled: true,
        type: 'full' as const,
        volume_percentage: 50,
        delay: null,
      };

      expect(typeof settings.enabled).toBe('boolean');
    });

    it('enabled pode ser string "true" (conforme API Pagarme)', () => {
      const settings = {
        enabled: 'true' as any,
        type: 'full' as const,
        volume_percentage: '50' as any,
        delay: 'null' as any,
      };

      expect(settings.enabled).toBe('true');
      expect(settings.volume_percentage).toBe('50');
      expect(settings.delay).toBe('null');
    });
  });
});

