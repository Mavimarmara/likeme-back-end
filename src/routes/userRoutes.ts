import { Router } from 'express';
import {
  createUser,
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser,
} from '@/controllers/userController';
import { createUserCrudSchema, updateUserCrudSchema, idParamSchema } from '@/utils/validationSchemas';
import { validate } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);
router.use(requireAuth);

router.post('/', generalRateLimiter, validate(createUserCrudSchema), createUser);
router.get('/', generalRateLimiter, getAllUsers);
router.get('/:id', generalRateLimiter, validate(idParamSchema, 'params'), getUserById);
router.put('/:id', generalRateLimiter, validate(updateUserCrudSchema), validate(idParamSchema, 'params'), updateUser);
router.delete('/:id', generalRateLimiter, validate(idParamSchema, 'params'), deleteUser);

export default router;

