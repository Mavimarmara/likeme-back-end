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
