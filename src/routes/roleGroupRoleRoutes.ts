import { Router } from 'express';
import {
  createRoleGroupRole,
  getRoleGroupRole,
  getAllRoleGroupRoles,
  deleteRoleGroupRole,
} from '@/controllers/roleGroupRoleController';
import { createRoleGroupRoleSchema, roleGroupRoleParamsSchema } from '@/utils/validationSchemas';
import { validate } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);
router.use(requireAuth);

router.post('/', generalRateLimiter, validate(createRoleGroupRoleSchema), createRoleGroupRole);
router.get('/', generalRateLimiter, getAllRoleGroupRoles);
router.get('/:roleGroupId/:roleId', generalRateLimiter, validate(roleGroupRoleParamsSchema, 'params'), getRoleGroupRole);
router.delete('/:roleGroupId/:roleId', generalRateLimiter, validate(roleGroupRoleParamsSchema, 'params'), deleteRoleGroupRole);

export default router;

