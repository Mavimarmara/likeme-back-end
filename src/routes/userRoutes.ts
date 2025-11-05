import { Router } from 'express';
import {
  createUser,
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser,
} from '@/controllers/userController';
import { createUserCrudSchema, updateUserCrudSchema, idParamSchema } from '@/utils/validationSchemas';
import { validate, validateParams } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);
router.use(requireAuth);

router.post('/', generalRateLimiter, validate(createUserCrudSchema), createUser);
router.get('/', generalRateLimiter, getAllUsers);
router.get('/:id', generalRateLimiter, validateParams(idParamSchema), getUserById);
router.put('/:id', generalRateLimiter, validate(updateUserCrudSchema), validateParams(idParamSchema), updateUser);
router.delete('/:id', generalRateLimiter, validateParams(idParamSchema), deleteUser);

export default router;

