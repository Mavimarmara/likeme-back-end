import { config } from '@/config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pagarme = require('pagarme');

let pagarmeClient: any = null;

/**
 * Cliente para integração com Pagarme
 */
export async function getPagarmeClient() {
  // Sempre criar novo cliente para evitar problemas de autenticação
  // (a biblioteca pode ter problemas com cache de autenticação)
  pagarmeClient = null;

  const apiKey = config.pagarme?.apiKey?.trim();
  
  if (!apiKey) {
    console.error('[Pagarme] PAGARME_API_KEY não configurada na variável de ambiente');
    throw new Error('PAGARME_API_KEY não configurada. Configure PAGARME_SECRET_API_KEY ou PAGARME_API_KEY no ambiente (deve ser uma chave secreta sk_test_* ou sk_live_*)');
  }

  // Validar formato da chave
  if (!apiKey.startsWith('sk_')) {
    const keyPreview = apiKey.length > 20 
      ? apiKey.substring(0, 15) + '...' + apiKey.substring(apiKey.length - 4)
      : apiKey.substring(0, Math.min(apiKey.length, 15));
    throw new Error(`Chave Pagarme inválida. O backend precisa de uma chave SECRETA (sk_test_* ou sk_live_*), mas recebeu: ${keyPreview}... (começa com '${apiKey.substring(0, 3)}')`);
  }

  const keyPreview = apiKey.length > 20 
    ? apiKey.substring(0, 15) + '...' + apiKey.substring(apiKey.length - 4)
    : apiKey.substring(0, Math.min(apiKey.length, 15));
  console.log('[Pagarme] Conectando com API Key:', keyPreview);
  console.log('[Pagarme] Tipo da chave:', apiKey.startsWith('sk_test_') ? 'TEST (sk_test_*)' : apiKey.startsWith('sk_live_') ? 'PRODUCTION (sk_live_*)' : 'DESCONHECIDO');
  console.log('[Pagarme] Tamanho da chave:', apiKey.length);

  try {
    pagarmeClient = await pagarme.client.connect({ api_key: apiKey });
    console.log('[Pagarme] ✅ Cliente conectado com sucesso');
    return pagarmeClient;
  } catch (error: any) {
    console.error('[Pagarme] ❌ Erro ao conectar:', error.message || error);
    console.error('[Pagarme] Erro completo:', JSON.stringify(error, null, 2));
    
    if (error.message && error.message.includes('valid API key')) {
      console.error('[Pagarme] ❌ A chave API fornecida não é válida para operações server-side');
      console.error('[Pagarme] ⚠️  Você está usando uma chave PÚBLICA (pk_*), mas o backend precisa de uma chave SECRETA (sk_*)');
      console.error('[Pagarme] Como obter:');
      console.error('  1. Acesse: https://dashboard.pagar.me/');
      console.error('  2. Vá em: Configurações → API Keys');
      console.error('  3. Copie a chave SECRETA (sk_test_* para teste ou sk_live_* para produção)');
      console.error('  4. Configure PAGARME_SECRET_API_KEY ou PAGARME_API_KEY no Vercel');
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
    console.log('[Pagarme] Criando transação com dados:', {
      amount: transactionData.amount,
      payment_method: transactionData.payment_method,
      customer_email: transactionData.customer.email,
      items_count: transactionData.items.length,
    });
    
    const transaction = await client.transactions.create(transactionData);
    console.log('[Pagarme] ✅ Transação criada com sucesso. ID:', transaction.id, 'Status:', transaction.status);
    return transaction;
  } catch (error: any) {
    console.error('[Pagarme] ❌ Erro ao criar transação:', error);
    console.error('[Pagarme] Erro completo:', JSON.stringify(error, null, 2));
    
    // Verificar se é erro de autenticação (401)
    if (error?.response?.status === 401 || error?.status === 401) {
      // Verificar se é erro de IP não autorizado
      const errors = error?.response?.errors || [];
      const ipError = errors.find((e: any) => 
        e.type === 'action_forbidden' && 
        (e.parameter_name === 'ip' || e.message?.includes('IP') || e.message?.includes('ip'))
      );
      
      if (ipError) {
        const errorMessage = `IP não autorizado pela Pagarme.\n` +
          `A Pagarme bloqueia requisições de IPs não autorizados por segurança.\n` +
          `Solução: Configure os IPs permitidos no dashboard Pagarme:\n` +
          `1. Acesse: https://dashboard.pagar.me/\n` +
          `2. Vá em: Configurações → API Keys\n` +
          `3. Clique na sua chave (sk_test_*)\n` +
          `4. Adicione os IPs do Vercel na lista de IPs permitidos\n` +
          `   Ou desabilite a restrição de IP para ambiente de teste\n\n` +
          `Nota: Para produção, recomendamos manter a restrição de IP ativada e configurar apenas os IPs do Vercel.`;
        
        console.error('[Pagarme] ❌ IP não autorizado:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // Outros erros 401
      const apiKey = config.pagarme?.apiKey?.trim();
      const keyPreview = apiKey 
        ? (apiKey.length > 20 ? apiKey.substring(0, 15) + '...' + apiKey.substring(apiKey.length - 4) : apiKey.substring(0, Math.min(15, apiKey.length)))
        : 'NÃO CONFIGURADA';
      
      const keyType = apiKey?.startsWith('sk_test_') ? 'TEST' : apiKey?.startsWith('sk_live_') ? 'PRODUCTION' : 'INVÁLIDA';
      
      const errorMessage = `Erro de autenticação Pagarme (401). Verifique a chave da API.\n` +
        `Chave atual: ${keyPreview} (${keyType})\n` +
        `Configure PAGARME_SECRET_API_KEY ou PAGARME_API_KEY no ambiente do Vercel com uma chave SECRETA válida (sk_test_* ou sk_live_*)\n` +
        `Certifique-se de que a chave está ativa no dashboard Pagarme.`;
      
      console.error('[Pagarme]', errorMessage);
      
      // Log adicional para debug
      if (error?.response?.errors) {
        console.error('[Pagarme] Detalhes do erro da API:', JSON.stringify(error.response.errors, null, 2));
      }
      
      throw new Error(errorMessage);
    }
    
    // Verificar se tem detalhes do erro
    if (error?.response?.errors) {
      const errors = Array.isArray(error.response.errors) 
        ? error.response.errors.map((e: any) => e.message || JSON.stringify(e)).join(', ')
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
