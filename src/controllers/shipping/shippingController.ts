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
    console.error('Shipping quote error:', error?.message || error);

    if (error?.message?.includes('8 dígitos')) {
      sendError(res, 'CEP inválido. Informe 8 dígitos.', 400);
      return;
    }
    if (error?.message?.includes('Nenhuma opção')) {
      sendError(res, 'Não há opção de frete para este CEP.', 404);
      return;
    }

    sendError(res, 'Erro ao consultar frete. Tente novamente.', 500, error?.message);
  }
};
