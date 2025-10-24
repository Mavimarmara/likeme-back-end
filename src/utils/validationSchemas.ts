import Joi from 'joi';

// User validation schemas
export const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required(),
  phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).optional(),
  birthDate: Joi.date().max('now').optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
});

export const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).optional(),
  birthDate: Joi.date().max('now').optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  avatar: Joi.string().uri().optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Anamnese validation schemas
export const createAnamneseSchema = Joi.object({
  answers: Joi.array().items(
    Joi.object({
      questionId: Joi.string().required(),
      answer: Joi.string().required(),
    })
  ).min(1).required(),
});

// Activity validation schemas
export const createActivitySchema = Joi.object({
  title: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(1000).optional(),
  category: Joi.string().valid('exercise', 'nutrition', 'mental', 'medical').required(),
  duration: Joi.number().integer().min(1).max(1440).optional(),
  difficulty: Joi.string().valid('Easy', 'Medium', 'Hard').required(),
  scheduledAt: Joi.date().min('now').optional(),
});

export const updateActivitySchema = Joi.object({
  title: Joi.string().min(2).max(200).optional(),
  description: Joi.string().max(1000).optional(),
  category: Joi.string().valid('exercise', 'nutrition', 'mental', 'medical').optional(),
  duration: Joi.number().integer().min(1).max(1440).optional(),
  difficulty: Joi.string().valid('Easy', 'Medium', 'Hard').optional(),
  completed: Joi.boolean().optional(),
  scheduledAt: Joi.date().min('now').optional(),
});

// Wellness validation schemas
export const createWellnessDataSchema = Joi.object({
  category: Joi.string().valid('physical', 'mental', 'emotional', 'social').required(),
  score: Joi.number().integer().min(0).max(100).required(),
  notes: Joi.string().max(500).optional(),
  date: Joi.date().max('now').optional(),
});

// Post validation schemas
export const createPostSchema = Joi.object({
  content: Joi.string().min(1).max(2000).required(),
  category: Joi.string().valid('tips', 'experiences', 'questions', 'achievements').required(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
});

export const updatePostSchema = Joi.object({
  content: Joi.string().min(1).max(2000).optional(),
  category: Joi.string().valid('tips', 'experiences', 'questions', 'achievements').optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
});

// Product validation schemas
export const createProductSchema = Joi.object({
  title: Joi.string().min(2).max(200).required(),
  description: Joi.string().min(10).max(2000).required(),
  category: Joi.string().valid('supplements', 'equipment', 'books', 'courses').required(),
  price: Joi.number().positive().precision(2).required(),
  originalPrice: Joi.number().positive().precision(2).optional(),
  discount: Joi.number().integer().min(0).max(100).optional(),
  image: Joi.string().uri().optional(),
  inStock: Joi.boolean().optional(),
  stock: Joi.number().integer().min(0).optional(),
});

export const updateProductSchema = Joi.object({
  title: Joi.string().min(2).max(200).optional(),
  description: Joi.string().min(10).max(2000).optional(),
  category: Joi.string().valid('supplements', 'equipment', 'books', 'courses').optional(),
  price: Joi.number().positive().precision(2).optional(),
  originalPrice: Joi.number().positive().precision(2).optional(),
  discount: Joi.number().integer().min(0).max(100).optional(),
  image: Joi.string().uri().optional(),
  inStock: Joi.boolean().optional(),
  stock: Joi.number().integer().min(0).optional(),
});

// Order validation schemas
export const createOrderSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required(),
    })
  ).min(1).required(),
  address: Joi.object({
    street: Joi.string().min(5).max(200).required(),
    city: Joi.string().min(2).max(100).required(),
    state: Joi.string().min(2).max(100).required(),
    zipCode: Joi.string().pattern(/^[0-9]{5}-?[0-9]{3}$/).required(),
    country: Joi.string().min(2).max(100).required(),
  }).required(),
});

// Health Provider validation schemas
export const createHealthProviderSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  specialty: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(1000).optional(),
  experience: Joi.number().integer().min(0).max(50).required(),
});

export const updateHealthProviderSchema = Joi.object({
  name: Joi.string().min(2).max(200).optional(),
  specialty: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(1000).optional(),
  experience: Joi.number().integer().min(0).max(50).optional(),
  isAvailable: Joi.boolean().optional(),
});

// Appointment validation schemas
export const createAppointmentSchema = Joi.object({
  providerId: Joi.string().required(),
  date: Joi.date().min('now').required(),
  duration: Joi.number().integer().min(15).max(480).required(), // 15 min to 8 hours
  notes: Joi.string().max(500).optional(),
});

export const updateAppointmentSchema = Joi.object({
  date: Joi.date().min('now').optional(),
  duration: Joi.number().integer().min(15).max(480).optional(),
  status: Joi.string().valid('scheduled', 'completed', 'cancelled').optional(),
  notes: Joi.string().max(500).optional(),
});

// Query validation schemas
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

// Params validation schemas
export const idParamSchema = Joi.object({
  id: Joi.string().required(),
});
