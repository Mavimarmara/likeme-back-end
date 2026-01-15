/**
 * Test Fixtures - Objetos reutilizáveis para testes
 * 
 * Uso:
 * import { createValidOrder, createValidUser } from '@/tests/fixtures/testFixtures';
 * 
 * const order = createValidOrder({ subtotal: 200 }); // Override específico
 */

import { Prisma } from '@prisma/client';

// ==================== USER & PERSON ====================

export interface TestUser {
  username: string;
  password: string;
  isActive: boolean;
}

export const createValidUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  username: `testuser_${Date.now()}@example.com`,
  password: 'hashedPassword123',
  isActive: true,
  ...overrides,
});

export interface TestPerson {
  firstName: string;
  lastName: string;
  nationalRegistration?: string;
  birthdate?: Date;
}

export const createValidPerson = (overrides: Partial<TestPerson> = {}): TestPerson => ({
  firstName: 'Test',
  lastName: 'User',
  nationalRegistration: '12345678901',
  ...overrides,
});

export interface TestPersonContact {
  personId: string;
  type: 'email' | 'phone' | 'whatsapp' | 'other';
  value: string;
}

export const createValidContact = (
  personId: string,
  overrides: Partial<Omit<TestPersonContact, 'personId'>> = {}
): TestPersonContact => ({
  personId,
  type: 'email',
  value: `test_${Date.now()}@example.com`,
  ...overrides,
});

// ==================== PRODUCT ====================

export interface TestProduct {
  name: string;
  description?: string;
  price: number;
  quantity: number;
  status: 'active' | 'inactive' | 'out_of_stock' | 'discontinued';
  category?: string;
  sku?: string;
}

export const createValidProduct = (overrides: Partial<TestProduct> = {}): TestProduct => ({
  name: `Test Product ${Date.now()}`,
  description: 'Test product description',
  price: 99.99,
  quantity: 10,
  status: 'active',
  ...overrides,
});

export const createOutOfStockProduct = (overrides: Partial<TestProduct> = {}): TestProduct => ({
  ...createValidProduct(),
  quantity: 0,
  status: 'out_of_stock',
  ...overrides,
});

export const createExternalProduct = (overrides: Partial<{
  name: string;
  externalUrl: string;
  status: string;
}> = {}) => ({
  name: `External Product ${Date.now()}`,
  externalUrl: 'https://www.amazon.com.br/dp/B08XYZ1234',
  status: 'active',
  ...overrides,
});

// ==================== ORDER ====================

export interface TestOrder {
  userId: string;
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
}

export const createValidOrder = (overrides: Partial<TestOrder> = {}): TestOrder => {
  const subtotal = overrides.subtotal ?? 100;
  const shippingCost = overrides.shippingCost ?? 10;
  const tax = overrides.tax ?? 5;

  return {
    userId: 'test-user-id',
    subtotal,
    shippingCost,
    tax,
    total: subtotal + shippingCost + tax,
    status: 'pending',
    paymentStatus: 'pending',
    ...overrides,
  };
};

export interface TestOrderItem {
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export const createValidOrderItem = (
  orderId: string,
  productId: string,
  overrides: Partial<Omit<TestOrderItem, 'orderId' | 'productId'>> = {}
): TestOrderItem => {
  const quantity = overrides.quantity ?? 2;
  const unitPrice = overrides.unitPrice ?? 50;
  const discount = overrides.discount ?? 0;

  return {
    orderId,
    productId,
    quantity,
    unitPrice,
    discount,
    total: quantity * unitPrice - discount,
    ...overrides,
  };
};

// ==================== PAYMENT ====================

export interface TestCardData {
  cardNumber: string;
  cardHolderName: string;
  cardExpirationDate: string; // MMYY
  cardCvv: string;
}

export const createValidCardData = (overrides: Partial<TestCardData> = {}): TestCardData => ({
  cardNumber: '4111111111111111', // Visa test card
  cardHolderName: 'TEST USER',
  cardExpirationDate: '1225', // December 2025
  cardCvv: '123',
  ...overrides,
});

export interface TestAddress {
  country: string;
  state: string;
  city: string;
  street: string;
  streetNumber: string;
  zipcode: string;
  neighborhood?: string;
  complement?: string;
}

export const createValidAddress = (overrides: Partial<TestAddress> = {}): TestAddress => ({
  country: 'br',
  state: 'SP',
  city: 'São Paulo',
  street: 'Avenida Paulista',
  streetNumber: '1000',
  zipcode: '01310100',
  neighborhood: 'Bela Vista',
  ...overrides,
});

// ==================== ANAMNESIS ====================

export interface TestAnamnesisQuestion {
  key: string;
  type: 'single_choice' | 'multiple_choice' | 'text' | 'number';
  locale: string;
  questionText: string;
  answerOptions?: Array<{
    key: string;
    order: number;
    text: string;
  }>;
}

export const createValidAnamnesisQuestion = (
  overrides: Partial<TestAnamnesisQuestion> = {}
): TestAnamnesisQuestion => ({
  key: `test_question_${Date.now()}`,
  type: 'single_choice',
  locale: 'pt-BR',
  questionText: 'Pergunta de teste?',
  answerOptions: [
    { key: 'opt1', order: 0, text: 'Opção 1' },
    { key: 'opt2', order: 1, text: 'Opção 2' },
  ],
  ...overrides,
});

export const createMindQuestion = (overrides: Partial<TestAnamnesisQuestion> = {}) =>
  createValidAnamnesisQuestion({
    key: `mind_${Date.now()}`,
    questionText: 'Como você está se sentindo?',
    ...overrides,
  });

export const createBodyQuestion = (overrides: Partial<TestAnamnesisQuestion> = {}) =>
  createValidAnamnesisQuestion({
    key: `body_${Date.now()}`,
    questionText: 'Você sente dores?',
    ...overrides,
  });

// ==================== AD ====================

export interface TestAd {
  advertiserId: string;
  title: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  productId?: string;
  externalUrl?: string;
}

export const createValidAd = (overrides: Partial<TestAd> = {}): TestAd => ({
  advertiserId: 'test-advertiser-id',
  title: `Test Ad ${Date.now()}`,
  description: 'Test ad description',
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  isActive: true,
  ...overrides,
});

// ==================== ADVERTISER ====================

export interface TestAdvertiser {
  name: string;
  email: string;
  companyName?: string;
  isActive: boolean;
}

export const createValidAdvertiser = (overrides: Partial<TestAdvertiser> = {}): TestAdvertiser => ({
  name: 'Test Advertiser',
  email: `advertiser_${Date.now()}@example.com`,
  companyName: 'Test Company',
  isActive: true,
  ...overrides,
});

// ==================== ACTIVITY ====================

export interface TestActivity {
  userId: string;
  type: string;
  data?: Record<string, any>;
}

export const createValidActivity = (overrides: Partial<TestActivity> = {}): TestActivity => ({
  userId: 'test-user-id',
  type: 'test_activity',
  data: { test: true },
  ...overrides,
});

// ==================== HELPERS ====================

/**
 * Converte valor em reais para centavos (formato Pagarme)
 */
export const toCents = (reais: number): number => Math.round(reais * 100);

/**
 * Converte centavos para reais
 */
export const toReais = (centavos: number): number => centavos / 100;

/**
 * Gera CPF válido para testes
 */
export const generateTestCPF = (): string => {
  // CPF de teste válido (não real)
  const testCPFs = [
    '11144477735',
    '12345678901',
    '98765432109',
    '11111111111', // CPF de teste comum
  ];
  return testCPFs[Math.floor(Math.random() * testCPFs.length)];
};

/**
 * Gera CNPJ válido para testes
 */
export const generateTestCNPJ = (): string => {
  return '12345678000190'; // CNPJ de teste válido
};

/**
 * Gera email único para testes
 */
export const generateTestEmail = (prefix = 'test'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
};

/**
 * Cria objeto completo de pedido para testes
 */
export const createCompleteOrderData = (userId: string, productId: string) => {
  const product = createValidProduct();
  const order = createValidOrder({ userId });
  const orderItem = createValidOrderItem('order-id', productId, {
    quantity: 2,
    unitPrice: product.price,
  });
  const cardData = createValidCardData();
  const billingAddress = createValidAddress();

  return {
    ...order,
    items: [orderItem],
    cardData,
    billingAddress,
  };
};

// ==================== EXPORTS ====================

export default {
  // User & Person
  createValidUser,
  createValidPerson,
  createValidContact,
  
  // Product
  createValidProduct,
  createOutOfStockProduct,
  createExternalProduct,
  
  // Order
  createValidOrder,
  createValidOrderItem,
  createCompleteOrderData,
  
  // Payment
  createValidCardData,
  createValidAddress,
  
  // Anamnesis
  createValidAnamnesisQuestion,
  createMindQuestion,
  createBodyQuestion,
  
  // Ad & Advertiser
  createValidAd,
  createValidAdvertiser,
  
  // Activity
  createValidActivity,
  
  // Helpers
  toCents,
  toReais,
  generateTestCPF,
  generateTestCNPJ,
  generateTestEmail,
};

