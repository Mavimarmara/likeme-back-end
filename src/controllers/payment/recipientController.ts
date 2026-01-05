import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { sendSuccess, sendError } from '@/utils/response';
import {
  createRecipient,
  getRecipient,
  listRecipients,
} from '@/clients/pagarme/pagarmeClient';
import type {
  IndividualRecipientData,
  CorporationRecipientData,
} from '@/interfaces/payment/payment';
import prisma from '@/config/database';

export const createIndividualRecipient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const recipientData: IndividualRecipientData = req.body;

    if (!recipientData.register_information || !recipientData.default_bank_account) {
      sendError(res, 'Dados do recebedor incompletos', 400);
      return;
    }

    const document = recipientData.register_information.document.replace(/\D/g, '');

    const existingRecipient = await prisma.pagarmeRecipient.findFirst({
      where: {
        document: document,
        type: 'individual',
        deletedAt: null,
      },
    });

    if (existingRecipient) {
      const recipientFromPagarme = await getRecipient(existingRecipient.recipientId);
      sendSuccess(res, recipientFromPagarme, 'Recebedor pessoa física encontrado (já cadastrado)');
      return;
    }

    const recipient = await createRecipient(recipientData);

    if (recipient && recipient.id) {
      const transferSettings = recipient.transfer_settings || {};
      const transferEnabled = transferSettings.transfer_enabled === true || transferSettings.transfer_enabled === 'true' || transferSettings.transfer_enabled === true;

      try {
        await prisma.pagarmeRecipient.create({
          data: {
            recipientId: recipient.id,
            name: recipient.name || recipient.register_information?.name || '',
            email: recipient.email || recipient.register_information?.email || '',
            document: document,
            type: recipient.type || 'individual',
            status: recipient.status || 'active',
            code: recipient.code || null,
            paymentMode: recipient.payment_mode || null,
            transferEnabled: transferEnabled,
            transferInterval: transferSettings.transfer_interval || null,
            transferDay: typeof transferSettings.transfer_day === 'number' ? transferSettings.transfer_day : null,
            isDefault: false,
          },
        });
        console.log('[RecipientController] Recipient salvo no banco:', recipient.id);
      } catch (dbError: any) {
        console.error('[RecipientController] Erro ao salvar recipient no banco:', dbError);
      }
    }

    sendSuccess(res, recipient, 'Recebedor pessoa física criado com sucesso', 201);
  } catch (error: any) {
    console.error('Erro ao criar recebedor pessoa física:', error);
    sendError(res, error.message || 'Erro ao criar recebedor', 500);
  }
};

export const createCorporationRecipient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const recipientData: CorporationRecipientData = req.body;

    if (!recipientData.register_information || !recipientData.default_bank_account) {
      sendError(res, 'Dados do recebedor incompletos', 400);
      return;
    }

    if (!recipientData.register_information.managing_partners || recipientData.register_information.managing_partners.length === 0) {
      sendError(res, 'Pelo menos um sócio administrador é obrigatório para pessoa jurídica', 400);
      return;
    }

    const document = recipientData.register_information.document.replace(/\D/g, '');

    const existingRecipient = await prisma.pagarmeRecipient.findFirst({
      where: {
        document: document,
        type: 'company',
        deletedAt: null,
      },
    });

    if (existingRecipient) {
      const recipientFromPagarme = await getRecipient(existingRecipient.recipientId);
      sendSuccess(res, recipientFromPagarme, 'Recebedor pessoa jurídica encontrado (já cadastrado)');
      return;
    }

    const recipient = await createRecipient(recipientData);

    if (recipient && recipient.id) {
      const transferSettings = recipient.transfer_settings || {};
      const transferEnabled = transferSettings.transfer_enabled === true || transferSettings.transfer_enabled === 'true' || transferSettings.transfer_enabled === true;

      try {
        await prisma.pagarmeRecipient.create({
          data: {
            recipientId: recipient.id,
            name: recipient.name || recipient.register_information?.company_name || '',
            email: recipient.email || recipient.register_information?.email || '',
            document: document,
            type: recipient.type || 'company',
            status: recipient.status || 'active',
            code: recipient.code || null,
            paymentMode: recipient.payment_mode || null,
            transferEnabled: transferEnabled,
            transferInterval: transferSettings.transfer_interval || null,
            transferDay: typeof transferSettings.transfer_day === 'number' ? transferSettings.transfer_day : null,
            isDefault: false,
          },
        });
        console.log('[RecipientController] Recipient salvo no banco:', recipient.id);
      } catch (dbError: any) {
        console.error('[RecipientController] Erro ao salvar recipient no banco:', dbError);
      }
    }

    sendSuccess(res, recipient, 'Recebedor pessoa jurídica criado com sucesso', 201);
  } catch (error: any) {
    console.error('Erro ao criar recebedor pessoa jurídica:', error);
    sendError(res, error.message || 'Erro ao criar recebedor', 500);
  }
};

export const getRecipientById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { recipientId } = req.params;

    if (!recipientId) {
      sendError(res, 'ID do recebedor é obrigatório', 400);
      return;
    }

    const recipient = await getRecipient(recipientId);

    sendSuccess(res, recipient, 'Recebedor encontrado');
  } catch (error: any) {
    console.error('Erro ao buscar recebedor:', error);
    sendError(res, error.message || 'Erro ao buscar recebedor', 500);
  }
};

export const listAllRecipients = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      page,
      size,
      code,
      status,
      created_since,
      created_until,
    } = req.query;

    const params: any = {};
    if (page) params.page = parseInt(page as string, 10);
    if (size) params.size = parseInt(size as string, 10);
    if (code) params.code = code as string;
    if (status) params.status = status as string;
    if (created_since) params.created_since = created_since as string;
    if (created_until) params.created_until = created_until as string;

    const result = await listRecipients(params);

    sendSuccess(res, result, 'Recebedores listados com sucesso');
  } catch (error: any) {
    console.error('Erro ao listar recebedores:', error);
    sendError(res, error.message || 'Erro ao listar recebedores', 500);
  }
};

