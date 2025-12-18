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

  const apiKey = config.pagarme?.apiKey;
  
  if (!apiKey) {
    throw new Error('PAGARME_API_KEY não configurada');
  }

  try {
    pagarmeClient = await pagarme.client.connect({ api_key: apiKey });
    return pagarmeClient;
  } catch (error) {
    console.error('Erro ao conectar com Pagarme:', error);
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
  } catch (error) {
    console.error('Erro ao criar transação Pagarme:', error);
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
