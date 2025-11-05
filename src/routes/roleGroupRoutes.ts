import { Router } from 'express';
import {
  createRoleGroup,
  getRoleGroupById,
  getAllRoleGroups,
  updateRoleGroup,
  deleteRoleGroup,
} from '@/controllers/roleGroupController';
import { createRoleGroupSchema, updateRoleGroupSchema, idParamSchema } from '@/utils/validationSchemas';
import { validate } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);
router.use(requireAuth);

router.post('/', generalRateLimiter, validate(createRoleGroupSchema), createRoleGroup);
router.get('/', generalRateLimiter, getAllRoleGroups);
router.get('/:id', generalRateLimiter, validate(idParamSchema, 'params'), getRoleGroupById);
router.put('/:id', generalRateLimiter, validate(updateRoleGroupSchema), validate(idParamSchema, 'params'), updateRoleGroup);
router.delete('/:id', generalRateLimiter, validate(idParamSchema, 'params'), deleteRoleGroup);

export default router;

