import { Request, Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import { getShippingQuote } from '@/services/shipping/cepcertoService';

/** Fallback de frete em reais quando a consulta aos Correios falha */
const SHIPPING_FALLBACK_VALUE = 15;

const SHIPPING_FALLBACK_OPTION = {
  codigo: 'FALLBACK',
  nome: 'Frete padrão',
  valor: SHIPPING_FALLBACK_VALUE,
  prazoEntrega: '-',
  valorMaoPropria: '0,00',
  valorAvisoRecebimento: '0,00',
  entregaDomiciliar: 'S',
  entregaSabado: 'N',
};

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
    const reason = /timeout|Timeout/i.test(msg)
      ? 'timeout'
      : /network|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|Correios indisponível/i.test(msg)
        ? 'network'
        : 'invalid_response';
    console.error(`Shipping quote error [${reason}]:`, msg || error);

    if (msg.includes('8 dígitos')) {
      sendError(res, 'CEP inválido. Informe 8 dígitos.', 400);
      return;
    }

    // Fallback: em qualquer outro erro da consulta, retorna frete fixo de R$ 15
    sendSuccess(res, {
      options: [SHIPPING_FALLBACK_OPTION],
      minValue: SHIPPING_FALLBACK_VALUE,
      cepDestino: (req.query.cep as string)?.trim()?.replace(/\D/g, '') ?? '',
    }, 'Consulta de frete realizada (valor padrão)');
  }
};
