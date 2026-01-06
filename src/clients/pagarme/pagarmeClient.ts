import { config } from '@/config';
import type {
  CreditCardData,
  CustomerData,
  AddressData,
  TransactionItem,
  PaymentSplit,
  IndividualRecipientData,
  CorporationRecipientData,
} from '@/interfaces/payment/payment';

export type {
  CreditCardData,
  CustomerData,
  AddressData,
  TransactionItem,
  PaymentSplit,
  IndividualRecipientData,
  CorporationRecipientData,
} from '@/interfaces/payment/payment';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pagarme = require('pagarme');

let pagarmeClient: any = null;

export async function getPagarmeClient() {
  pagarmeClient = null;

  const apiKey = config.pagarme?.apiKey?.trim();
  
  if (!apiKey) {
    console.error('[Pagarme] PAGARME_API_KEY não configurada na variável de ambiente');
    throw new Error('PAGARME_API_KEY não configurada. Configure PAGARME_SECRET_API_KEY ou PAGARME_API_KEY no ambiente (deve ser uma chave secreta sk_test_* ou sk_live_*)');
  }

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

export async function createCreditCardTransaction(params: {
  amount: number;
  cardData: CreditCardData;
  customer: CustomerData;
  billing: {
    name: string;
    address: AddressData;
  };
  items: TransactionItem[];
  metadata?: Record<string, any>;
  split?: PaymentSplit[];
}): Promise<any> {
  const apiKey = config.pagarme?.apiKey?.trim();
  
  if (!apiKey) {
    throw new Error('PAGARME_API_KEY não configurada');
  }

  if (!apiKey.startsWith('sk_')) {
    throw new Error(`Chave Pagarme inválida. Deve começar com 'sk_' mas recebeu: ${apiKey.substring(0, 3)}`);
  }

  const customerType = params.customer.type || 'individual';
  if (customerType === 'individual' && (!params.customer.documents?.[0]?.number)) {
    throw new Error('CPF é obrigatório para clientes do tipo individual na Pagarme');
  }

  let validSplit = params.split;
  if (validSplit && validSplit.length > 0) {
    const validSplits = validSplit.filter(s => s.recipient_id && s.recipient_id.trim() !== '');
    if (validSplits.length !== validSplit.length) {
      console.warn(`[Pagarme] ⚠️  Alguns splits foram removidos por falta de recipient_id. Total válidos: ${validSplits.length}/${validSplit.length}`);
      validSplit = validSplits.length > 0 ? validSplits : undefined;
    }
  }

  const transactionData: any = {
    items: params.items.map(item => ({
      amount: item.unitPrice,
      description: item.title,
      quantity: item.quantity,
    })),
    customer: {
      name: params.customer.name,
      email: params.customer.email,
      type: customerType,
      document: params.customer.documents?.[0]?.number?.replace(/\D/g, '') || '',
      // Telefone é OBRIGATÓRIO para Pagarme - sempre incluir
      phones: (params.customer.phoneNumbers && params.customer.phoneNumbers.length > 0 
        ? params.customer.phoneNumbers 
        : ['11999999999'] // Telefone padrão se não fornecido
      ).map(phone => {
        const cleanPhone = phone.replace(/\D/g, '');
        const areaCode = cleanPhone.length >= 10 ? cleanPhone.substring(0, 2) : '11';
        const number = cleanPhone.length >= 10 ? cleanPhone.substring(2) : cleanPhone;
        return {
          country_code: '55',
          area_code: areaCode,
          number: number,
        };
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
            exp_month: parseInt(params.cardData.cardExpirationDate.substring(0, 2), 10),
            exp_year: parseInt('20' + params.cardData.cardExpirationDate.substring(2, 4), 10),
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
        ...(validSplit && validSplit.length > 0 && {
          split: validSplit.map(splitItem => {
            console.log('[Pagarme] Adicionando split:', {
              type: splitItem.type,
              amount: splitItem.amount,
              recipient_id: splitItem.recipient_id?.substring(0, 20) + '...',
            });
            return {
              type: splitItem.type,
              amount: splitItem.amount,
              recipient_id: splitItem.recipient_id,
              options: {
                charge_processing_fee: splitItem.options?.charge_processing_fee ?? false,
                charge_remainder_fee: splitItem.options?.charge_remainder_fee ?? false,
                liable: splitItem.options?.liable ?? false,
              },
            };
          }),
        }),
      },
    ],
  };

  if (params.metadata && Object.keys(params.metadata).length > 0) {
    transactionData.metadata = params.metadata;
  }

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
      hasPhones: !!transactionData.customer.phones && transactionData.customer.phones.length > 0,
      phonesCount: transactionData.customer.phones?.length || 0,
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
    console.log('[Pagarme] Split configurado:', validSplit ? `${validSplit.length} split(s)` : 'Nenhum split');

  try {
    const requestBody = JSON.stringify(transactionData);
    console.log('[Pagarme] Criando pedido via REST API v5:', {
      items_count: transactionData.items.length,
      customer_email: params.customer.email,
      customer_type: customerType,
      has_document: !!transactionData.customer.document,
      request_size: requestBody.length,
      has_split: !!(validSplit && validSplit.length > 0),
      split_count: validSplit?.length || 0,
    });
    
    console.log('[Pagarme] URL da requisição: https://api.pagar.me/core/v5/orders');
    console.log('[Pagarme] Headers:', {
      'Authorization': `Basic ${authString.substring(0, 20)}...`,
      'Content-Type': 'application/json',
    });
    
    const response = await fetch('https://api.pagar.me/core/v5/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });
    
    console.log('[Pagarme] Resposta recebida. Status:', response.status, response.statusText);

    const responseText = await response.text();
    let responseData: any;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('[Pagarme] ❌ Erro ao parsear resposta JSON:', responseText.substring(0, 500));
      throw new Error(`Resposta inválida da Pagarme: ${responseText.substring(0, 200)}`);
    }

    if (!response.ok) {
      const errors = responseData.errors || [];
      const fullErrorDetails = {
        status: response.status,
        statusText: response.statusText,
        errors: errors,
        full_response: responseData,
      };
      
      console.error('[Pagarme] ❌ Erro na resposta da API:', JSON.stringify(fullErrorDetails, null, 2));
      
      // Verificar erro de IP
      const ipError = errors.find((e: any) => 
        e.type === 'action_forbidden' && 
        (e.parameter_name === 'ip' || e.message?.includes('IP') || e.message?.includes('ip'))
      );
      
      if (ipError) {
        throw new Error(`IP não autorizado pela Pagarme. Configure os IPs permitidos no dashboard Pagarme ou desabilite a restrição de IP.`);
      }
      
      // Extrair mensagens de erro de forma mais detalhada
      let errorMessages: string[] = [];
      if (Array.isArray(errors) && errors.length > 0) {
        errors.forEach((e: any) => {
          if (e.message) {
            errorMessages.push(e.message);
          } else if (e.parameter_name && e.message) {
            errorMessages.push(`${e.parameter_name}: ${e.message}`);
          } else {
            errorMessages.push(JSON.stringify(e));
          }
        });
      } else if (responseData.message) {
        errorMessages.push(responseData.message);
      } else {
        errorMessages.push(JSON.stringify(responseData));
      }
      
      const finalMessage = errorMessages.length > 0 
        ? errorMessages.join('; ')
        : `Erro desconhecido da Pagarme (${response.status})`;
      
      throw new Error(`Pagamento recusado pela Pagarme. Status: ${response.status}. ${finalMessage}`);
    }

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
          message: charge.last_transaction.message,
          gateway_response: charge.last_transaction.gateway_response,
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
    
    // Se o status for refused/failed, logar detalhes do erro
    if (transactionStatus === 'refused' || transactionStatus === 'failed') {
      console.error('[Pagarme] ❌ Transação recusada. Detalhes:', {
        transactionId: transaction?.id,
        chargeId: charge?.id,
        status: transactionStatus,
        message: transaction?.message || charge?.message,
        gateway_response: transaction?.gateway_response || charge?.gateway_response,
        errors: transaction?.errors || charge?.errors,
      });
    }
    
    console.log('[Pagarme] ✅ Pedido criado. Order ID:', order.id, 'Charge ID:', charge?.id, 'Transaction ID:', transactionId, 'Status:', transactionStatus);
    
    // Incluir dados completos da transação para extração de erros
    return {
      id: transactionId,
      status: transactionStatus,
      authorization_code: transaction?.acquirer_response_code || charge?.acquirer_response_code,
      message: transaction?.message || charge?.message,
      gateway_response: transaction?.gateway_response || charge?.gateway_response,
      ...(transaction || charge || order),
    };
  } catch (error: any) {
    if (error.message && error.message.includes('Erro Pagarme')) {
      throw error;
    }
    
    console.error('[Pagarme] ❌ Erro ao criar transação:', error);
    
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

export async function createRecipient(
  recipientData: IndividualRecipientData | CorporationRecipientData
): Promise<any> {
  const apiKey = config.pagarme?.apiKey?.trim();
  
  if (!apiKey) {
    throw new Error('PAGARME_API_KEY não configurada');
  }

  if (!apiKey.startsWith('sk_')) {
    throw new Error(`Chave Pagarme inválida. Deve começar com 'sk_' mas recebeu: ${apiKey.substring(0, 3)}`);
  }

  const authString = Buffer.from(`${apiKey}:`).toString('base64');
  const requestBody = JSON.stringify(recipientData);

  console.log('[Pagarme] 📤 Criando recebedor:', {
    type: recipientData.register_information.type,
    document: recipientData.register_information.document.substring(0, 3) + '***',
    email: recipientData.register_information.email,
  });

  try {
    const response = await fetch('https://api.pagar.me/core/v5/recipients', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: requestBody,
    });

    const responseData: any = await response.json();

    if (!response.ok) {
      console.error('[Pagarme] ❌ Erro ao criar recebedor:', {
        status: response.status,
        statusText: response.statusText,
        errors: responseData.errors || responseData,
        full_response: JSON.stringify(responseData, null, 2),
      });
      
      const errors = responseData.errors || [];
      const errorMessages = Array.isArray(errors) 
        ? errors.map((e: any) => e.message || JSON.stringify(e)).join(', ')
        : JSON.stringify(responseData);
      
      throw new Error(`Erro ao criar recebedor na Pagarme (${response.status}): ${errorMessages}`);
    }

    console.log('[Pagarme] ✅ Recebedor criado com sucesso:', {
      id: responseData.id,
      name: responseData.name,
      email: responseData.email,
      status: responseData.status,
    });

    return responseData;
  } catch (error: any) {
    console.error('[Pagarme] ❌ Erro ao criar recebedor:', error);
    
    if (error.message && error.message.includes('Erro ao criar recebedor')) {
      throw error;
    }
    
    throw new Error(`Erro ao criar recebedor: ${error.message || 'Erro desconhecido'}`);
  }
}

export async function getRecipient(recipientId: string): Promise<any> {
  const apiKey = config.pagarme?.apiKey?.trim();
  
  if (!apiKey) {
    throw new Error('PAGARME_API_KEY não configurada');
  }

  if (!apiKey.startsWith('sk_')) {
    throw new Error(`Chave Pagarme inválida. Deve começar com 'sk_' mas recebeu: ${apiKey.substring(0, 3)}`);
  }

  const authString = Buffer.from(`${apiKey}:`).toString('base64');

  try {
    const response = await fetch(`https://api.pagar.me/core/v5/recipients/${recipientId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json',
      },
    });

    const responseData: any = await response.json();

    if (!response.ok) {
      console.error('[Pagarme] ❌ Erro ao buscar recebedor:', {
        status: response.status,
        errors: responseData.errors || responseData,
      });
      
      const errors = responseData.errors || [];
      const errorMessages = Array.isArray(errors) 
        ? errors.map((e: any) => e.message || JSON.stringify(e)).join(', ')
        : JSON.stringify(responseData);
      
      throw new Error(`Erro ao buscar recebedor na Pagarme (${response.status}): ${errorMessages}`);
    }

    return responseData;
  } catch (error: any) {
    console.error('[Pagarme] ❌ Erro ao buscar recebedor:', error);
    throw error;
  }
}

export async function listRecipients(params?: {
  page?: number;
  size?: number;
  code?: string;
  status?: string;
  created_since?: string;
  created_until?: string;
}): Promise<any> {
  const apiKey = config.pagarme?.apiKey?.trim();
  
  if (!apiKey) {
    throw new Error('PAGARME_API_KEY não configurada');
  }

  if (!apiKey.startsWith('sk_')) {
    throw new Error(`Chave Pagarme inválida. Deve começar com 'sk_' mas recebeu: ${apiKey.substring(0, 3)}`);
  }

  const authString = Buffer.from(`${apiKey}:`).toString('base64');
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.size) queryParams.append('size', params.size.toString());
  if (params?.code) queryParams.append('code', params.code);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.created_since) queryParams.append('created_since', params.created_since);
  if (params?.created_until) queryParams.append('created_until', params.created_until);

  const queryString = queryParams.toString();
  const url = `https://api.pagar.me/core/v5/recipients${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json',
      },
    });

    const responseData: any = await response.json();

    if (!response.ok) {
      console.error('[Pagarme] ❌ Erro ao listar recebedores:', {
        status: response.status,
        errors: responseData.errors || responseData,
      });
      
      const errors = responseData.errors || [];
      const errorMessages = Array.isArray(errors) 
        ? errors.map((e: any) => e.message || JSON.stringify(e)).join(', ')
        : JSON.stringify(responseData);
      
      throw new Error(`Erro ao listar recebedores na Pagarme (${response.status}): ${errorMessages}`);
    }

    return responseData;
  } catch (error: any) {
    console.error('[Pagarme] ❌ Erro ao listar recebedores:', error);
    throw error;
  }
}
