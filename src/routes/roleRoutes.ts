import { Router } from 'express';
import {
  createRole,
  getRoleById,
  getAllRoles,
  updateRole,
  deleteRole,
} from '@/controllers/roleController';
import { createRoleSchema, updateRoleSchema, idParamSchema } from '@/utils/validationSchemas';
import { validate } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);
router.use(requireAuth);

router.post('/', generalRateLimiter, validate(createRoleSchema), createRole);
router.get('/', generalRateLimiter, getAllRoles);
router.get('/:id', generalRateLimiter, validate(idParamSchema, 'params'), getRoleById);
router.put('/:id', generalRateLimiter, validate(updateRoleSchema), validate(idParamSchema, 'params'), updateRole);
router.delete('/:id', generalRateLimiter, validate(idParamSchema, 'params'), deleteRole);

export default router;

