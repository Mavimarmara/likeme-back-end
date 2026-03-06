/**
 * Serviço de consulta de frete via API CepCerto.
 * Documentação: https://www.cepcerto.com/api-para-calculo-de-frete-dos-correios
 * Endpoint: GET https://cepcerto.com/ws/json-frete/cep-origem/cep-destino/peso/altura/largura/comprimento/chave
 * - Peso em gramas (300g a 30kg). Altura, largura e comprimento em cm.
 */

const CEPCERTO_BASE = 'https://cepcerto.com/ws/json-frete';
const DEFAULT_ORIGIN_CEP = '01310100';

/** CEP de origem do envio (loja). */
const ORIGIN_CEP = (process.env.SHIPPING_ORIGIN_CEP || DEFAULT_ORIGIN_CEP).replace(/\D/g, '');

/** Chave da API CepCerto. Use "teste" para testes (5 consultas grátis). Obtenha em https://www.cepcerto.com/minha-chave */
const CEPCERTO_API_KEY = (process.env.CEPCERTO_API_KEY || 'teste').trim();

/** Pacote padrão: 1 kg, 20x20x20 cm. Peso em gramas. */
const DEFAULT_PESO_GRAMAS = 1000;
const DEFAULT_ALTURA_CM = 20;
const DEFAULT_LARGURA_CM = 20;
const DEFAULT_COMPRIMENTO_CM = 20;

const TIMEOUT_MS = 10000;

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

/** Resposta da API CepCerto (endpoint resumido). */
interface CepCertoFreteResponse {
  ceporigem?: string;
  cepdestino?: string;
  valorpac?: string;
  prazopac?: string;
  valorsedex?: string;
  prazosedex?: string;
  linkpostagem?: string;
  erro?: string;
  mensagem?: string;
}

function parseValor(str: string | undefined): number {
  if (str == null || typeof str !== 'string') return 0;
  const normalized = String(str).replace(',', '.');
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
}

export async function getShippingQuote(cepDestino: string): Promise<ShippingOption[]> {
  const cep = (cepDestino || '').replace(/\D/g, '');
  if (cep.length !== 8) {
    throw new Error('CEP deve ter 8 dígitos');
  }

  const url = `${CEPCERTO_BASE}/${ORIGIN_CEP}/${cep}/${DEFAULT_PESO_GRAMAS}/${DEFAULT_ALTURA_CM}/${DEFAULT_LARGURA_CM}/${DEFAULT_COMPRIMENTO_CM}/${encodeURIComponent(CEPCERTO_API_KEY)}`;

  let response: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Timeout na consulta ao frete');
    }
    if (/timeout|Timeout/i.test(msg)) {
      throw new Error('Timeout na consulta ao frete');
    }
    if (/network|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|fetch failed/i.test(msg)) {
      throw new Error('Serviço de frete indisponível. Tente novamente em instantes.');
    }
    throw new Error('Resposta inválida do serviço de frete');
  }

  let data: CepCertoFreteResponse = {};
  try {
    const text = await response.text();
    if (text) data = JSON.parse(text) as CepCertoFreteResponse;
  } catch {
    throw new Error('Resposta inválida do serviço de frete');
  }

  if (data.erro || data.mensagem) {
    throw new Error(data.mensagem || data.erro || 'Erro na consulta de frete');
  }

  const options: ShippingOption[] = [];
  const valorPac = parseValor(data.valorpac);
  const valorSedex = parseValor(data.valorsedex);

  if (valorPac > 0) {
    options.push({
      codigo: '04510',
      nome: 'PAC',
      valor: valorPac,
      prazoEntrega: String(data.prazopac ?? '-'),
      valorMaoPropria: '0,00',
      valorAvisoRecebimento: '0,00',
      entregaDomiciliar: 'S',
      entregaSabado: 'N',
    });
  }
  if (valorSedex > 0) {
    options.push({
      codigo: '04014',
      nome: 'SEDEX',
      valor: valorSedex,
      prazoEntrega: String(data.prazosedex ?? '-'),
      valorMaoPropria: '0,00',
      valorAvisoRecebimento: '0,00',
      entregaDomiciliar: 'S',
      entregaSabado: 'N',
    });
  }

  if (options.length === 0) {
    throw new Error('Nenhuma opção de frete disponível para este CEP');
  }

  return options;
}
