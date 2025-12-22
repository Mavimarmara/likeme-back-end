import { config } from '@/config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pagarme = require('pagarme');

let pagarmeClient: any = null;

/**
 * Cliente para integração com Pagarme
 */
export async function getPagarmeClient() {
  if (pagarmeClient) {
    return pagarmeClient;
  }

  const apiKey = config.pagarme?.apiKey?.trim();
  
  if (!apiKey) {
    console.error('[Pagarme] PAGARME_API_KEY não configurada na variável de ambiente');
    throw new Error('PAGARME_API_KEY não configurada. Configure a variável de ambiente PAGARME_API_KEY no arquivo .env');
  }

  const keyPreview = apiKey.length > 20 
    ? apiKey.substring(0, 15) + '...' + apiKey.substring(apiKey.length - 4)
    : apiKey.substring(0, Math.min(apiKey.length, 15));
  console.log('[Pagarme] Tentando conectar com API Key:', keyPreview);
  console.log('[Pagarme] Tamanho da chave:', apiKey.length);

  try {
    pagarmeClient = await pagarme.client.connect({ api_key: apiKey });
    console.log('[Pagarme] ✅ Cliente conectado com sucesso');
    return pagarmeClient;
  } catch (error: any) {
    console.error('[Pagarme] ❌ Erro ao conectar:', error.message || error);
    
    if (error.message && error.message.includes('valid API key')) {
      console.error('[Pagarme] ❌ A chave API fornecida não é válida para operações server-side');
      console.error('[Pagarme] ⚠️  Você está usando uma chave PÚBLICA (pk_*), mas o backend precisa de uma chave SECRETA (sk_*)');
      console.error('[Pagarme] Como obter:');
      console.error('  1. Acesse: https://dashboard.pagar.me/');
      console.error('  2. Vá em: Configurações → API Keys');
      console.error('  3. Copie a chave SECRETA (sk_test_* para teste ou sk_live_* para produção)');
      console.error('  4. Configure PAGARME_API_KEY no .env e no Vercel');
      console.error('[Pagarme] Chave atual (primeiros 15 chars):', apiKey.substring(0, Math.min(15, apiKey.length)) + '...');
    }
    
    throw error;
  }
}

/**
 * Interface para dados de cartão de crédito
 */
export interface CreditCardData {
  cardNumber: string;
  cardHolderName: string;
  cardExpirationDate: string; // MMYY format
  cardCvv: string;
}

/**
 * Interface para dados do cliente
 */
export interface CustomerData {
  externalId: string; // ID do usuário no nosso sistema
  name: string;
  email: string;
  type?: 'individual' | 'corporation';
  country?: string; // 'br'
  documents?: Array<{
    type: 'cpf' | 'cnpj';
    number: string;
  }>;
  phoneNumbers?: string[];
  birthday?: string; // YYYY-MM-DD
}

/**
 * Interface para dados de endereço
 */
export interface AddressData {
  country: string; // 'br'
  state: string; // UF
  city: string;
  neighborhood: string;
  street: string;
  streetNumber: string;
  zipcode: string;
  complement?: string;
}

/**
 * Interface para item de transação
 */
export interface TransactionItem {
  id: string;
  title: string;
  unitPrice: number; // em centavos
  quantity: number;
  tangible?: boolean;
}

/**
 * Cria uma transação com cartão de crédito
 */
export async function createCreditCardTransaction(params: {
  amount: number; // em centavos
  cardData: CreditCardData;
  customer: CustomerData;
  billing: {
    name: string;
    address: AddressData;
  };
  items: TransactionItem[];
  metadata?: Record<string, any>;
}): Promise<any> {
  const client = await getPagarmeClient();

  const transactionData = {
    amount: params.amount,
    payment_method: 'credit_card',
    card_number: params.cardData.cardNumber.replace(/\s/g, ''), // Remove espaços
    card_holder_name: params.cardData.cardHolderName,
    card_expiration_date: params.cardData.cardExpirationDate,
    card_cvv: params.cardData.cardCvv,
    customer: {
      external_id: params.customer.externalId,
      name: params.customer.name,
      type: params.customer.type || 'individual',
      country: params.customer.country || 'br',
      email: params.customer.email,
      documents: params.customer.documents || [],
      phone_numbers: params.customer.phoneNumbers || [],
      birthday: params.customer.birthday,
    },
    billing: {
      name: params.billing.name,
      address: {
        country: params.billing.address.country,
        state: params.billing.address.state,
        city: params.billing.address.city,
        neighborhood: params.billing.address.neighborhood,
        street: params.billing.address.street,
        street_number: params.billing.address.streetNumber,
        zipcode: params.billing.address.zipcode.replace(/\D/g, ''), // Remove caracteres não numéricos
        complement: params.billing.address.complement,
      },
    },
    items: params.items.map(item => ({
      id: item.id,
      title: item.title,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      tangible: item.tangible !== false, // Default true
    })),
    metadata: params.metadata || {},
  };

  try {
    const transaction = await client.transactions.create(transactionData);
    return transaction;
  } catch (error: any) {
    console.error('Erro ao criar transação Pagarme:', error);
    
    // Verificar se é erro de autenticação (401)
    if (error?.response?.status === 401 || error?.status === 401) {
      const apiKey = config.pagarme?.apiKey?.trim();
      const keyPreview = apiKey 
        ? (apiKey.length > 20 ? apiKey.substring(0, 15) + '...' + apiKey.substring(apiKey.length - 4) : apiKey.substring(0, Math.min(15, apiKey.length)))
        : 'NÃO CONFIGURADA';
      
      const errorMessage = `Erro de autenticação Pagarme (401). Verifique a chave da API.\n` +
        `Chave atual: ${keyPreview}\n` +
        `Configure PAGARME_SECRET_API_KEY ou PAGARME_API_KEY no ambiente com uma chave SECRETA (sk_test_* ou sk_live_*)\n` +
        `A chave deve começar com 'sk_' para operações server-side.`;
      
      console.error('[Pagarme]', errorMessage);
      throw new Error(errorMessage);
    }
    
    // Verificar se tem detalhes do erro
    if (error?.response?.errors) {
      const errors = Array.isArray(error.response.errors) 
        ? error.response.errors.map((e: any) => e.message || e).join(', ')
        : JSON.stringify(error.response.errors);
      throw new Error(`Erro Pagarme: ${errors}`);
    }
    
    throw error;
  }
}

/**
 * Busca uma transação por ID
 */
export async function getTransaction(transactionId: string): Promise<any> {
  const client = await getPagarmeClient();

  try {
    const transaction = await client.transactions.find({ id: transactionId });
    return transaction;
  } catch (error) {
    console.error('Erro ao buscar transação Pagarme:', error);
    throw error;
  }
}

/**
 * Captura uma transação (autorizada)
 */
export async function captureTransaction(
  transactionId: string,
  amount?: number
): Promise<any> {
  const client = await getPagarmeClient();

  try {
    const captureData = amount ? { amount } : {};
    const transaction = await client.transactions.capture({
      id: transactionId,
      ...captureData,
    });
    return transaction;
  } catch (error) {
    console.error('Erro ao capturar transação Pagarme:', error);
    throw error;
  }
}

/**
 * Estorna uma transação
 */
export async function refundTransaction(
  transactionId: string,
  amount?: number
): Promise<any> {
  const client = await getPagarmeClient();

  try {
    const refundData = amount ? { amount } : {};
    const transaction = await client.transactions.refund({
      id: transactionId,
      ...refundData,
    });
    return transaction;
  } catch (error) {
    console.error('Erro ao estornar transação Pagarme:', error);
    throw error;
  }
}
