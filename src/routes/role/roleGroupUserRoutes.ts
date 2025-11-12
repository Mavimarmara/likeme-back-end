import { Router } from 'express';
import {
  createRoleGroupUser,
  getRoleGroupUser,
  getAllRoleGroupUsers,
  deleteRoleGroupUser,
} from '@/controllers/role/roleGroupUserController';
import { createRoleGroupUserSchema, roleGroupUserParamsSchema } from '@/utils/validationSchemas';
import { validate, validateParams } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);
router.use(requireAuth);

router.post('/', generalRateLimiter, validate(createRoleGroupUserSchema), createRoleGroupUser);
router.get('/', generalRateLimiter, getAllRoleGroupUsers);
router.get('/:userId/:roleGroupId', generalRateLimiter, validateParams(roleGroupUserParamsSchema), getRoleGroupUser);
router.delete('/:userId/:roleGroupId', generalRateLimiter, validateParams(roleGroupUserParamsSchema), deleteRoleGroupUser);

export default router;

