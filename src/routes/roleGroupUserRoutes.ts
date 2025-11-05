import { Router } from 'express';
import {
  createRoleGroupUser,
  getRoleGroupUser,
  getAllRoleGroupUsers,
  deleteRoleGroupUser,
} from '@/controllers/roleGroupUserController';
import { createRoleGroupUserSchema, roleGroupUserParamsSchema } from '@/utils/validationSchemas';
import { validate } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);
router.use(requireAuth);

router.post('/', generalRateLimiter, validate(createRoleGroupUserSchema), createRoleGroupUser);
router.get('/', generalRateLimiter, getAllRoleGroupUsers);
router.get('/:userId/:roleGroupId', generalRateLimiter, validate(roleGroupUserParamsSchema, 'params'), getRoleGroupUser);
router.delete('/:userId/:roleGroupId', generalRateLimiter, validate(roleGroupUserParamsSchema, 'params'), deleteRoleGroupUser);

export default router;

