import prisma from '@/config/database';
import { createRecipient, getRecipient } from '@/clients/pagarme/pagarmeClient';
import type { IndividualRecipientData, CorporationRecipientData } from '@/interfaces/payment/payment';

export class RecipientService {
  async ensureAdvertiserHasRecipient(advertiserId: string): Promise<string | null> {
    const advertiser = await prisma.advertiser.findUnique({
      where: { id: advertiserId },
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
      },
    });

    if (!advertiser) {
      throw new Error('Advertiser não encontrado');
    }

    if (advertiser.pagarmeRecipientId) {
      const existingRecipient = await prisma.pagarmeRecipient.findUnique({
        where: { recipientId: advertiser.pagarmeRecipientId },
      });

      if (existingRecipient) {
        return advertiser.pagarmeRecipientId;
      }
    }

    const user = advertiser.user;

    const emailContact = user.person.contacts.find((c) => c.type === 'email');
    const phoneContact = user.person.contacts.find((c) => c.type === 'phone' || c.type === 'whatsapp');

    if (!emailContact) {
      throw new Error('Usuário precisa ter um email cadastrado para criar recipient');
    }

    const document = user.person.nationalRegistration?.replace(/\D/g, '') || '';

    if (!document || document.length < 11) {
      throw new Error('Usuário precisa ter CPF/CNPJ cadastrado para criar recipient');
    }

    const isCPF = document.length === 11;
    const recipientData: IndividualRecipientData | CorporationRecipientData = isCPF
      ? this.buildIndividualRecipientData(user, emailContact.value, phoneContact?.value, document)
      : this.buildCorporationRecipientData(user, emailContact.value, phoneContact?.value, document);

    try {
      const recipient = await createRecipient(recipientData);

      if (recipient && recipient.id) {
        console.log('[RecipientService] ✅ Recipient criado com sucesso na Pagarme:', recipient.id);
        const transferSettings = recipient.transfer_settings || {};
        const transferEnabled = transferSettings.transfer_enabled === true || transferSettings.transfer_enabled === 'true';

        const savedRecipient = await prisma.pagarmeRecipient.create({
          data: {
            recipientId: recipient.id,
            name: recipient.name || user.person.firstName + ' ' + user.person.lastName,
            email: recipient.email || emailContact.value,
            document: document,
            type: recipient.type || (isCPF ? 'individual' : 'company'),
            status: recipient.status || 'active',
            code: recipient.code || null,
            paymentMode: recipient.payment_mode || null,
            transferEnabled: transferEnabled,
            transferInterval: transferSettings.transfer_interval || null,
            transferDay: typeof transferSettings.transfer_day === 'number' ? transferSettings.transfer_day : null,
            isDefault: false,
          },
        });

        await prisma.advertiser.update({
          where: { id: advertiserId },
          data: { pagarmeRecipientId: recipient.id },
        });

        return recipient.id;
      }
    } catch (error: any) {
      console.error('[RecipientService] ❌ Erro ao criar recipient:', error);
      
      // Se for erro de permissão, logar informação útil
      if (error.message && error.message.includes('not allowed to create a recipient')) {
        console.error('[RecipientService] ⚠️  ATENÇÃO: Conta Pagarme não tem permissão para criar recipients.');
        console.error('[RecipientService] ⚠️  É necessário habilitar Marketplace/Recipients na conta Pagarme.');
        console.error('[RecipientService] ⚠️  Entre em contato com suporte@pagarme.com para habilitar esta funcionalidade.');
      }
      
      throw error;
    }

    return null;
  }

  private buildIndividualRecipientData(
    user: any,
    email: string,
    phone: string | undefined,
    document: string
  ): IndividualRecipientData {
    const fullName = `${user.person.firstName} ${user.person.lastName}`;
    const phoneNumbers = phone
      ? [
          {
            ddd: phone.substring(0, 2),
            number: phone.substring(2).replace(/\D/g, ''),
            type: 'mobile' as const,
          },
        ]
      : [];

    return {
      register_information: {
        phone_numbers: phoneNumbers,
        address: {
          street: 'Rua Não Informada',
          street_number: '0',
          complementary: 'Não informado',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zip_code: '01000000',
          reference_point: 'Não informado',
        },
        name: fullName,
        email,
        document,
        type: 'individual',
        site_url: process.env.FRONTEND_URL || 'https://likeme.com.br',
        mother_name: 'Não informado',
        birthdate: user.person.birthdate
          ? `${String(user.person.birthdate.getDate()).padStart(2, '0')}/${String(user.person.birthdate.getMonth() + 1).padStart(2, '0')}/${user.person.birthdate.getFullYear()}`
          : '01/01/1990',
        monthly_income: 0,
        professional_occupation: 'Não informado',
      },
      default_bank_account: {
        holder_name: fullName,
        holder_type: 'individual',
        holder_document: document,
        bank: '341',
        branch_number: '0001',
        branch_check_digit: '0',
        account_number: '00000000',
        account_check_digit: '0',
        type: 'checking',
      },
      transfer_settings: {
        transfer_enabled: true,
        transfer_interval: 'Weekly',
        transfer_day: 1,
      },
    };
  }

  private buildCorporationRecipientData(
    user: any,
    email: string,
    phone: string | undefined,
    document: string
  ): CorporationRecipientData {
    const companyName = `${user.person.firstName} ${user.person.lastName}`;
    const phoneNumbers = phone
      ? [
          {
            ddd: phone.substring(0, 2),
            number: phone.substring(2).replace(/\D/g, ''),
            type: 'mobile' as const,
          },
        ]
      : [];

    return {
      name: companyName,
      email,
      description: `Recebedor: ${companyName}`,
      document,
      type: 'company',
      default_bank_account: {
        holder_name: companyName,
        holder_type: 'individual',
        holder_document: document,
        bank: '341',
        branch_number: '0001',
        branch_check_digit: '0',
        account_number: '00000000',
        account_check_digit: '0',
        type: 'checking',
      },
      transfer_settings: {
        transfer_enabled: true,
        transfer_interval: 'Weekly',
        transfer_day: 1,
      },
      register_information: {
        phone_numbers: phoneNumbers,
        site_url: process.env.FRONTEND_URL || 'https://likeme.com.br',
        company_name: companyName,
        trading_name: `${companyName} ME`,
        annual_revenue: 0,
        corporation_type: 'ME',
        founding_date: user.person.birthdate
          ? `${user.person.birthdate.getFullYear()}-${String(user.person.birthdate.getMonth() + 1).padStart(2, '0')}-${String(user.person.birthdate.getDate()).padStart(2, '0')}`
          : '2010-01-01',
        main_address: {
          street: 'Rua Não Informada',
          street_number: '0',
          complementary: 'Não informado',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zip_code: '01000000',
          reference_point: 'Não informado',
        },
        managing_partners: [
          {
            name: companyName,
            email: email,
            document: document,
            type: 'individual',
            mother_name: '',
            birthdate: user.person.birthdate
              ? `${String(user.person.birthdate.getDate()).padStart(2, '0')}/${String(user.person.birthdate.getMonth() + 1).padStart(2, '0')}/${user.person.birthdate.getFullYear()}`
              : '01/01/1990',
            monthly_income: 0,
            professional_occupation: '',
            self_declared_legal_representative: true,
            address: {
              street: 'Rua Não Informada',
              street_number: '0',
              complementary: 'Não informado',
              neighborhood: 'Centro',
              city: 'São Paulo',
              state: 'SP',
              zip_code: '01000000',
              reference_point: 'Não informado',
            },
            phone_numbers: phoneNumbers,
          },
        ],
      },
    };
  }
}

export const recipientService = new RecipientService();

