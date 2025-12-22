import Joi from 'joi';

export const createUserSchema = Joi.object({
  username: Joi.string().min(3).max(50).optional(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required(),
  firstName: Joi.string().min(2).max(100).required(),
  lastName: Joi.string().min(2).max(100).required(),
  surname: Joi.string().min(2).max(100).optional(),
  phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).optional(),
  birthdate: Joi.date().max('now').optional(),
  avatar: Joi.string().uri().optional(),
});

export const createUserCrudSchema = Joi.object({
  personId: Joi.string().required(),
  username: Joi.string().min(3).max(50).optional(),
  password: Joi.string().min(6).max(100).required(),
  salt: Joi.string().optional(),
  avatar: Joi.string().uri().optional(),
  isActive: Joi.boolean().optional(),
});

export const updateUserSchema = Joi.object({
  username: Joi.string().min(3).max(50).optional(),
  firstName: Joi.string().min(2).max(100).optional(),
  lastName: Joi.string().min(2).max(100).optional(),
  surname: Joi.string().min(2).max(100).optional(),
  birthdate: Joi.date().max('now').optional(),
  avatar: Joi.string().uri().optional(),
  isActive: Joi.boolean().optional(),
});

export const updateUserCrudSchema = Joi.object({
  username: Joi.string().min(3).max(50).optional(),
  password: Joi.string().min(6).max(100).optional(),
  salt: Joi.string().optional(),
  avatar: Joi.string().uri().optional(),
  isActive: Joi.boolean().optional(),
});

export const loginSchema = Joi.object({
  idToken: Joi.string().optional(),
  user: Joi.object({
    email: Joi.string().email().optional(),
    name: Joi.string().optional(),
    picture: Joi.string().uri().optional(),
  }).optional(),
}).min(0);

export const verifyTokenSchema = Joi.object({
  idToken: Joi.string().required(),
});

export const exchangeCodeSchema = Joi.object({
  code: Joi.string().required(),
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

export const searchSchema = Joi.object({
  search: Joi.string().max(100).optional(),
  category: Joi.string().max(50).optional(),
  sortBy: Joi.string().max(50).optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

export const upsertTipSchema = Joi.object({
  id: Joi.string().uuid({ version: 'uuidv4' }).optional(),
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().min(3).max(500).required(),
  image: Joi.string().uri({ allowRelative: true }).max(500).required(),
  order: Joi.number().integer().min(0).optional(),
});

export const createPersonSchema = Joi.object({
  firstName: Joi.string().min(2).max(100).required(),
  lastName: Joi.string().min(2).max(100).required(),
  surname: Joi.string().min(2).max(100).optional(),
  nationalRegistration: Joi.string().max(50).optional(),
  birthdate: Joi.date().max('now').optional(),
});

export const updatePersonSchema = Joi.object({
  firstName: Joi.string().min(2).max(100).optional(),
  lastName: Joi.string().min(2).max(100).optional(),
  surname: Joi.string().min(2).max(100).optional(),
  nationalRegistration: Joi.string().max(50).optional(),
  birthdate: Joi.date().max('now').optional(),
});

export const createPersonContactSchema = Joi.object({
  personId: Joi.string().required(),
  type: Joi.string().valid('email', 'phone', 'whatsapp', 'other').required(),
  value: Joi.string().required(),
});

export const updatePersonContactSchema = Joi.object({
  type: Joi.string().valid('email', 'phone', 'whatsapp', 'other').optional(),
  value: Joi.string().optional(),
});

export const createRoleSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).optional(),
});

export const updateRoleSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(500).optional(),
});

export const createRoleGroupSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).optional(),
});

export const updateRoleGroupSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(500).optional(),
});

export const createRoleGroupRoleSchema = Joi.object({
  roleGroupId: Joi.string().required(),
  roleId: Joi.string().required(),
});

export const roleGroupRoleParamsSchema = Joi.object({
  roleGroupId: Joi.string().required(),
  roleId: Joi.string().required(),
});

export const createRoleGroupUserSchema = Joi.object({
  userId: Joi.string().required(),
  roleGroupId: Joi.string().required(),
});

export const roleGroupUserParamsSchema = Joi.object({
  userId: Joi.string().required(),
  roleGroupId: Joi.string().required(),
});

export const createPersonalObjectiveSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(500).optional(),
  order: Joi.number().integer().optional(),
});

export const updatePersonalObjectiveSchema = Joi.object({
  name: Joi.string().min(2).max(200).optional(),
  description: Joi.string().max(500).optional(),
  order: Joi.number().integer().optional(),
});

export const createUserPersonalObjectiveSchema = Joi.object({
  userId: Joi.string().optional(),
  objectiveId: Joi.string().required(),
});

export const addMyObjectiveSchema = Joi.object({
  objectiveId: Joi.string().required(),
});

export const userPersonalObjectiveParamsSchema = Joi.object({
  userId: Joi.string().required(),
  objectiveId: Joi.string().required(),
});

export const objectiveIdParamSchema = Joi.object({
  objectiveId: Joi.string().required(),
});

export const idParamSchema = Joi.object({
  id: Joi.string().required(),
});

// ============================================
// PRODUCT VALIDATION SCHEMAS
// ============================================

export const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(2000).optional(),
  sku: Joi.string().max(100).optional(),
  price: Joi.number().positive().precision(2).optional(),
  cost: Joi.number().positive().precision(2).optional(),
  quantity: Joi.number().integer().min(0).optional(),
  image: Joi.string().uri().max(500).optional(),
  category: Joi.string().max(100).optional(),
  brand: Joi.string().max(100).optional(),
  status: Joi.string().valid('active', 'inactive', 'out_of_stock').default('active'),
  weight: Joi.number().positive().precision(3).optional(),
  dimensions: Joi.string().max(50).optional(),
  externalUrl: Joi.string().uri().max(1000).optional(),
}).or('price', 'externalUrl'); // Require either price or externalUrl

export const updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(200).optional(),
  description: Joi.string().max(2000).optional(),
  sku: Joi.string().max(100).optional(),
  price: Joi.number().positive().precision(2).optional(),
  cost: Joi.number().positive().precision(2).optional(),
  quantity: Joi.number().integer().min(0).optional(),
  image: Joi.string().uri().max(500).optional(),
  category: Joi.string().max(100).optional(),
  brand: Joi.string().max(100).optional(),
  status: Joi.string().valid('active', 'inactive', 'out_of_stock').optional(),
  weight: Joi.number().positive().precision(3).optional(),
  dimensions: Joi.string().max(50).optional(),
});

export const updateStockSchema = Joi.object({
  quantity: Joi.number().integer().required(),
  operation: Joi.string().valid('add', 'subtract', 'set').required(),
});

// ============================================
// ORDER VALIDATION SCHEMAS
// ============================================

export const orderItemSchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().integer().positive().required(),
  discount: Joi.number().min(0).precision(2).default(0),
});

export const createOrderSchema = Joi.object({
  userId: Joi.string().optional(),
  items: Joi.array().items(orderItemSchema).min(1).required(),
  status: Joi.string().valid('pending', 'processing', 'shipped', 'delivered', 'cancelled').default('pending'),
  shippingCost: Joi.number().min(0).precision(2).default(0),
  tax: Joi.number().min(0).precision(2).default(0),
  shippingAddress: Joi.string().max(500).optional(),
  notes: Joi.string().max(1000).optional(),
  paymentMethod: Joi.string().max(100).optional(),
  trackingNumber: Joi.string().max(100).optional(),
  // Dados do pagamento (obrigatórios - pagamento será processado com Pagarme ao criar pedido)
  cardData: Joi.object({
    cardNumber: Joi.string().pattern(/^[\d\s]+$/).min(13).max(19).required(),
    cardHolderName: Joi.string().min(3).max(100).required(),
    cardExpirationDate: Joi.string().pattern(/^\d{4}$/).length(4).required(),
    cardCvv: Joi.string().pattern(/^\d+$/).min(3).max(4).required(),
  }).required(),
  billingAddress: Joi.object({
    country: Joi.string().default('br'),
    state: Joi.string().min(2).max(2).required(),
    city: Joi.string().min(2).max(100).required(),
    neighborhood: Joi.string().min(2).max(100).optional(),
    street: Joi.string().min(2).max(200).required(),
    streetNumber: Joi.string().min(1).max(20).required(),
    zipcode: Joi.string().pattern(/^[\d-]+$/).min(8).max(10).required(),
    complement: Joi.string().max(200).optional(),
  }).required(),
}).and('cardData', 'billingAddress'); // Se cardData for fornecido, billingAddress também deve ser

export const updateOrderSchema = Joi.object({
  status: Joi.string().valid('pending', 'processing', 'shipped', 'delivered', 'cancelled').optional(),
  shippingAddress: Joi.string().max(500).optional(),
  billingAddress: Joi.string().max(500).optional(),
  notes: Joi.string().max(1000).optional(),
  paymentMethod: Joi.string().max(100).optional(),
  paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded').optional(),
  trackingNumber: Joi.string().max(100).optional(),
  restoreStock: Joi.boolean().optional(),
});

// ============================================
// AD VALIDATION SCHEMAS
// ============================================

export const createAdSchema = Joi.object({
  advertiserId: Joi.string().optional(),
  productId: Joi.string().optional(),
  product: Joi.object({
    name: Joi.string().min(2).max(200).optional(),
    description: Joi.string().max(2000).optional(),
    image: Joi.string().uri().max(500).optional(),
    price: Joi.number().positive().precision(2).optional(),
    quantity: Joi.number().integer().min(0).optional(),
    category: Joi.string().valid('amazon product', 'physical product', 'program').optional(),
    externalUrl: Joi.string().uri().max(1000).optional(),
    status: Joi.string().valid('active', 'inactive', 'out_of_stock').optional(),
  }).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).optional(),
  status: Joi.string().valid('active', 'inactive', 'expired').default('active'),
  targetAudience: Joi.string().max(200).optional(),
}).xor('productId', 'product'); // Require either productId or product

export const updateAdSchema = Joi.object({
  advertiserId: Joi.string().optional().allow(null),
  productId: Joi.string().optional().allow(null),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  status: Joi.string().valid('active', 'inactive', 'expired').optional(),
  targetAudience: Joi.string().max(200).optional(),
});

// ============================================
// ADVERTISER VALIDATION SCHEMAS
// ============================================

export const createAdvertiserSchema = Joi.object({
  userId: Joi.string().optional(),
  name: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(2000).optional(),
  logo: Joi.string().uri().max(500).optional(),
  contactEmail: Joi.string().email().max(200).optional(),
  contactPhone: Joi.string().max(50).optional(),
  website: Joi.string().uri().max(500).optional(),
  status: Joi.string().valid('active', 'inactive', 'suspended').default('active'),
});

export const updateAdvertiserSchema = Joi.object({
  name: Joi.string().min(2).max(200).optional(),
  description: Joi.string().max(2000).optional(),
  logo: Joi.string().uri().max(500).optional(),
  contactEmail: Joi.string().email().max(200).optional(),
  contactPhone: Joi.string().max(50).optional(),
  website: Joi.string().uri().max(500).optional(),
  status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
});

// ============================================
// AMAZON VALIDATION SCHEMAS
// ============================================

export const externalUrlQuerySchema = Joi.object({
  externalUrl: Joi.string().uri().required(),
});

export const adIdParamSchema = Joi.object({
  adId: Joi.string().required(),
});

export const userIdParamSchema = Joi.object({
  userId: Joi.string().required(),
});

// ============================================
// PAYMENT VALIDATION SCHEMAS
// ============================================

export const processPaymentSchema = Joi.object({
  orderId: Joi.string().uuid().required(),
  cardData: Joi.object({
    cardNumber: Joi.string().pattern(/^[\d\s]+$/).min(13).max(19).required(),
    cardHolderName: Joi.string().min(3).max(100).required(),
    cardExpirationDate: Joi.string().pattern(/^\d{4}$/).length(4).required(),
    cardCvv: Joi.string().pattern(/^\d+$/).min(3).max(4).required(),
  }).required(),
  billingAddress: Joi.object({
    country: Joi.string().default('br'),
    state: Joi.string().min(2).max(2).required(),
    city: Joi.string().min(2).max(100).required(),
    neighborhood: Joi.string().min(2).max(100).optional(),
    street: Joi.string().min(2).max(200).required(),
    streetNumber: Joi.string().min(1).max(20).required(),
    zipcode: Joi.string().pattern(/^[\d-]+$/).min(8).max(10).required(),
    complement: Joi.string().max(200).optional(),
  }).required(),
});

export const transactionIdParamSchema = Joi.object({
  transactionId: Joi.string().required(),
});

export const capturePaymentSchema = Joi.object({
  amount: Joi.number().positive().optional(),
});

export const refundPaymentSchema = Joi.object({
  amount: Joi.number().positive().optional(),
});

// ============================================
// ACTIVITY VALIDATION SCHEMAS
// ============================================

export const createActivitySchema = Joi.object({
  userId: Joi.string().optional(),
  name: Joi.string().min(1).max(200).required(),
  type: Joi.string().valid('task', 'event').required(),
  startDate: Joi.date().iso().required(),
  startTime: Joi.string().max(20).optional().allow('', null),
  endDate: Joi.date().iso().optional().allow(null),
  endTime: Joi.string().max(20).optional().allow('', null),
  location: Joi.string().max(500).optional().allow('', null),
  description: Joi.string().max(2000).optional().allow('', null),
  reminderEnabled: Joi.boolean().optional(),
  reminderOffset: Joi.string().max(50).optional().allow('', null),
});

export const updateActivitySchema = Joi.object({
  name: Joi.string().min(1).max(200).optional(),
  type: Joi.string().valid('task', 'event').optional(),
  startDate: Joi.date().iso().optional(),
  startTime: Joi.string().max(20).optional().allow('', null),
  endDate: Joi.date().iso().optional().allow(null),
  endTime: Joi.string().max(20).optional().allow('', null),
  location: Joi.string().max(500).optional().allow('', null),
  description: Joi.string().max(2000).optional().allow('', null),
  reminderEnabled: Joi.boolean().optional(),
  reminderOffset: Joi.string().max(50).optional().allow('', null),
});
