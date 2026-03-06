import { Request, Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import { getShippingQuote } from '@/services/shipping/correiosService';

export const quote = async (req: Request, res: Response): Promise<void> => {
  try {
    const cep = (req.query.cep as string)?.trim();
    if (!cep) {
      sendError(res, 'CEP é obrigatório', 400);
      return;
    }

    const options = await getShippingQuote(cep);

    const minValue = Math.min(...options.map((o) => o.valor));

    sendSuccess(res, {
      options,
      minValue,
      cepDestino: cep.replace(/\D/g, ''),
    }, 'Consulta de frete realizada');
  } catch (error: any) {
    const msg = error?.message ?? (typeof error === 'string' ? error : '');
    console.error('Shipping quote error:', msg || error);

    if (msg.includes('8 dígitos')) {
      sendError(res, 'CEP inválido. Informe 8 dígitos.', 400);
      return;
    }
    if (msg.includes('Nenhuma opção')) {
      sendError(res, 'Não há opção de frete para este CEP.', 404);
      return;
    }
    if (msg.includes('Timeout') || error?.code === 'ECONNABORTED') {
      sendError(res, 'Consulta aos Correios demorou demais. Tente novamente em instantes.', 504);
      return;
    }
    if (msg.includes('indisponível') || msg.includes('Resposta inválida')) {
      sendError(res, 'Serviço dos Correios temporariamente indisponível. Tente em alguns minutos.', 502);
      return;
    }

    sendError(res, 'Não foi possível consultar o frete. Tente novamente em alguns minutos.', 500, msg || undefined);
  }
};
