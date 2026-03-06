import { calcularPrecoPrazo } from 'correios-brasil';

/** CEP de origem do envio (loja). Padrão: São Paulo. */
const DEFAULT_ORIGIN_CEP = '01310100';
const ORIGIN_CEP = (process.env.SHIPPING_ORIGIN_CEP || DEFAULT_ORIGIN_CEP).replace(/\D/g, '');

/** Códigos de serviço: 04014 = SEDEX à vista, 04510 = PAC à vista */
const SERVICOS = ['04014', '04510'];

/** Formato 1 = caixa/pacote. Dimensões em cm, peso em kg. */
const DEFAULT_PACKAGE = {
  nCdFormato: '1',
  nVlComprimento: '20',
  nVlAltura: '20',
  nVlLargura: '20',
  nVlDiametro: '0',
  nVlPeso: '1',
};

export interface ShippingOption {
  codigo: string;
  nome: string;
  valor: number;
  prazoEntrega: string;
  valorMaoPropria: string;
  valorAvisoRecebimento: string;
  entregaDomiciliar: string;
  entregaSabado: string;
  msgErro?: string;
}

/** Converte "53,10" para 53.10 */
function parseValor(str: string): number {
  if (!str || typeof str !== 'string') return 0;
  const normalized = str.replace(',', '.');
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
}

const SERVICO_NAMES: Record<string, string> = {
  '04014': 'SEDEX',
  '04510': 'PAC',
  '04065': 'SEDEX à vista (entrega)',
  '04707': 'PAC à vista (entrega)',
};

export async function getShippingQuote(cepDestino: string): Promise<ShippingOption[]> {
  const cep = (cepDestino || '').replace(/\D/g, '');
  if (cep.length !== 8) {
    throw new Error('CEP deve ter 8 dígitos');
  }

  const args = {
    sCepOrigem: ORIGIN_CEP,
    sCepDestino: cep,
    nCdServico: SERVICOS,
    ...DEFAULT_PACKAGE,
  };

  const TIMEOUT_MS = 10000; // 10s para caber em limites de serverless

  let response: any;
  try {
    response = await Promise.race([
      calcularPrecoPrazo(args),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout na consulta aos Correios')), TIMEOUT_MS),
      ),
    ]);
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (/timeout|Timeout/i.test(msg)) throw new Error('Timeout na consulta aos Correios');
    if (/network|ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(msg)) {
      throw new Error('Correios indisponível. Tente novamente em instantes.');
    }
    throw new Error('Resposta inválida dos Correios');
  }

  if (!Array.isArray(response)) {
    throw new Error('Resposta inválida dos Correios');
  }

  const options: ShippingOption[] = response
    .filter((item: any) => item && item.Codigo && item.Valor)
    .map((item: any) => ({
      codigo: String(item.Codigo),
      nome: SERVICO_NAMES[item.Codigo] || item.Codigo,
      valor: parseValor(item.Valor),
      prazoEntrega: String(item.PrazoEntrega || ''),
      valorMaoPropria: String(item.ValorMaoPropria || '0,00'),
      valorAvisoRecebimento: String(item.ValorAvisoRecebimento || '0,00'),
      entregaDomiciliar: String(item.EntregaDomiciliar || 'N'),
      entregaSabado: String(item.EntregaSabado || 'N'),
      msgErro: item.MsgErro ? String(item.MsgErro) : undefined,
    }))
    .filter((opt) => opt.valor > 0);

  if (options.length === 0) {
    throw new Error('Nenhuma opção de frete disponível para este CEP');
  }

  return options;
}
