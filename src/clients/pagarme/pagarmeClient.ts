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
 * Cria uma transação com cartão de crédito usando REST API direto (conforme documentação oficial)
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
  const apiKey = config.pagarme?.apiKey?.trim();
  
  if (!apiKey) {
    throw new Error('PAGARME_API_KEY não configurada');
  }

  if (!apiKey.startsWith('sk_')) {
    throw new Error(`Chave Pagarme inválida. Deve começar com 'sk_' mas recebeu: ${apiKey.substring(0, 3)}`);
  }

  // Validar CPF obrigatório para individual
  const customerType = params.customer.type || 'individual';
  if (customerType === 'individual' && (!params.customer.documents?.[0]?.number)) {
    throw new Error('CPF é obrigatório para clientes do tipo individual na Pagarme');
  }

  // Preparar dados do pedido (formato da API v5 - Orders)
  const transactionData: any = {
    items: params.items.map(item => ({
      amount: item.unitPrice, // em centavos por item
      description: item.title,
      quantity: item.quantity,
    })),
    customer: {
      name: params.customer.name,
      email: params.customer.email,
      type: customerType,
      // CPF é obrigatório para individual, CNPJ para company
      document: params.customer.documents?.[0]?.number?.replace(/\D/g, '') || '',
      ...(params.customer.phoneNumbers && params.customer.phoneNumbers.length > 0 && {
        phones: params.customer.phoneNumbers.map(phone => {
          const cleanPhone = phone.replace(/\D/g, ''); // Remove caracteres não numéricos
          // Assume formato brasileiro: +55 (XX) XXXXX-XXXX ou similar
          const areaCode = cleanPhone.length >= 10 ? cleanPhone.substring(0, 2) : '11';
          const number = cleanPhone.length >= 10 ? cleanPhone.substring(2) : cleanPhone;
          return {
            country_code: '55',
            area_code: areaCode,
            number: number,
          };
        }),
      }),
    },
    payments: [
      {
        payment_method: 'credit_card',
        credit_card: {
          installments: 1,
          statement_descriptor: 'LIKEME',
          card: {
            number: params.cardData.cardNumber.replace(/\s/g, ''),
            holder_name: params.cardData.cardHolderName,
            exp_month: parseInt(params.cardData.cardExpirationDate.substring(0, 2), 10), // Remove zero à esquerda se existir (ex: 01 -> 1)
            exp_year: parseInt('20' + params.cardData.cardExpirationDate.substring(2, 4), 10), // Garante 4 dígitos (YYYY)
            cvv: params.cardData.cardCvv,
            billing_address: {
              line_1: `${params.billing.address.street}, ${params.billing.address.streetNumber}${params.billing.address.complement ? ' - ' + params.billing.address.complement : ''}`,
              zip_code: params.billing.address.zipcode.replace(/\D/g, ''),
              city: params.billing.address.city,
              state: params.billing.address.state,
              country: params.billing.address.country?.toUpperCase() || 'BR',
            },
          },
        },
      },
    ],
  };

  // Adicionar metadata se fornecido
  if (params.metadata && Object.keys(params.metadata).length > 0) {
    transactionData.metadata = params.metadata;
  }

  // Criar Basic Auth conforme documentação: base64(sk_test_*:)
  const authString = Buffer.from(`${apiKey}:`).toString('base64');

  // Log da requisição (sem dados sensíveis do cartão)
  const logData = {
    items: transactionData.items,
    customer: {
      name: transactionData.customer.name,
      email: transactionData.customer.email,
      type: transactionData.customer.type,
      document: transactionData.customer.document ? `${transactionData.customer.document.substring(0, 3)}***` : 'NÃO FORNECIDO',
      phones: transactionData.customer.phones,
    },
    payment_method: transactionData.payments[0].payment_method,
    card: {
      number: transactionData.payments[0].credit_card.card.number.substring(0, 4) + '****' + transactionData.payments[0].credit_card.card.number.substring(transactionData.payments[0].credit_card.card.number.length - 4),
      holder_name: transactionData.payments[0].credit_card.card.holder_name,
      exp_month: transactionData.payments[0].credit_card.card.exp_month,
      exp_year: transactionData.payments[0].credit_card.card.exp_year,
      billing_address: transactionData.payments[0].credit_card.card.billing_address,
    },
  };
  console.log('[Pagarme] 📤 Enviando requisição completa:', JSON.stringify(logData, null, 2));

  try {
    const requestBody = JSON.stringify(transactionData);
    console.log('[Pagarme] Criando pedido via REST API v5:', {
      items_count: transactionData.items.length,
      customer_email: params.customer.email,
      customer_type: customerType,
      has_document: !!transactionData.customer.document,
      request_size: requestBody.length,
    });
    
    const response = await fetch('https://api.pagar.me/core/v5/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });

    const responseData: any = await response.json();

    if (!response.ok) {
      console.error('[Pagarme] ❌ Erro na resposta da API:', {
        status: response.status,
        statusText: response.statusText,
        errors: responseData.errors || responseData,
        full_response: JSON.stringify(responseData, null, 2),
      });
      
      // Verificar se é erro de IP não autorizado
      const errors = responseData.errors || [];
      const ipError = errors.find((e: any) => 
        e.type === 'action_forbidden' && 
        (e.parameter_name === 'ip' || e.message?.includes('IP') || e.message?.includes('ip'))
      );
      
      if (ipError) {
        throw new Error(`IP não autorizado pela Pagarme. Configure os IPs permitidos no dashboard Pagarme ou desabilite a restrição de IP.`);
      }
      
      const errorMessages = Array.isArray(errors) 
        ? errors.map((e: any) => e.message || JSON.stringify(e)).join(', ')
        : JSON.stringify(responseData);
      
      throw new Error(`Erro Pagarme (${response.status}): ${errorMessages}`);
    }

    // A resposta da API v5 retorna um Order com charges
    // Precisamos extrair a transação do order
    const order: any = responseData;
    const charge: any = order?.charges?.[0];
    const transaction: any = charge?.last_transaction || charge;
    
    // Log detalhado da resposta para debug
    console.log('[Pagarme] 📦 Resposta completa da API:', JSON.stringify({
      orderId: order?.id,
      orderStatus: order?.status,
      chargesCount: order?.charges?.length || 0,
      charge: charge ? {
        id: charge.id,
        status: charge.status,
        amount: charge.amount,
        lastTransaction: charge.last_transaction ? {
          id: charge.last_transaction.id,
          status: charge.last_transaction.status,
        } : null,
      } : null,
    }, null, 2));
    
    if (!transaction && !charge) {
      console.warn('[Pagarme] ⚠️  Resposta não contém charge/transação esperada:', JSON.stringify(order, null, 2));
      // Retornar a estrutura esperada
      return {
        id: order.id,
        status: 'pending',
        ...order,
      };
    }

    // Na API v5, o status pode estar em:
    // 1. charge.status (mais comum)
    // 2. charge.last_transaction.status (transação mais recente)
    // 3. order.status (status geral do pedido)
    const transactionId = transaction?.id || charge?.id || order?.id;
    const transactionStatus = transaction?.status || charge?.status || order?.status || 'pending';
    
    console.log('[Pagarme] ✅ Pedido criado. Order ID:', order.id, 'Charge ID:', charge?.id, 'Transaction ID:', transactionId, 'Status:', transactionStatus);
    
    // Retornar no formato esperado pelo nosso código
    return {
      id: transactionId,
      status: transactionStatus,
      authorization_code: transaction?.acquirer_response_code || charge?.acquirer_response_code,
      ...(transaction || charge || order),
    };
  } catch (error: any) {
    // Se o erro já foi tratado acima (fetch error), apenas re-throw
    if (error.message && error.message.includes('Erro Pagarme')) {
      throw error;
    }
    
    console.error('[Pagarme] ❌ Erro ao criar transação:', error);
    
    // Se for um erro de fetch, tratar aqui
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Erro de conexão com Pagarme: ${error.message}`);
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
