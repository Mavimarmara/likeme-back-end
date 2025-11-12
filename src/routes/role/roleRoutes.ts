import { Router } from 'express';
import {
  createRole,
  getRoleById,
  getAllRoles,
  updateRole,
  deleteRole,
} from '@/controllers/role/roleController';
import { createRoleSchema, updateRoleSchema, idParamSchema } from '@/utils/validationSchemas';
import { validate, validateParams } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);
router.use(requireAuth);

router.post('/', generalRateLimiter, validate(createRoleSchema), createRole);
router.get('/', generalRateLimiter, getAllRoles);
router.get('/:id', generalRateLimiter, validateParams(idParamSchema), getRoleById);
router.put('/:id', generalRateLimiter, validate(updateRoleSchema), validateParams(idParamSchema), updateRole);
router.delete('/:id', generalRateLimiter, validateParams(idParamSchema), deleteRole);

export default router;

