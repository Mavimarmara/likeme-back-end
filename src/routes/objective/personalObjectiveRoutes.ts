import { Router } from 'express';
import {
  createPersonalObjective,
  getPersonalObjectiveById,
  getAllPersonalObjectives,
  updatePersonalObjective,
  deletePersonalObjective,
} from '@/controllers/objective/personalObjectiveController';
import { createPersonalObjectiveSchema, updatePersonalObjectiveSchema, idParamSchema } from '@/utils/validationSchemas';
import { validate, validateParams } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);
router.use(requireAuth);

router.post('/', generalRateLimiter, validate(createPersonalObjectiveSchema), createPersonalObjective);
router.get('/', generalRateLimiter, getAllPersonalObjectives);
router.get('/:id', generalRateLimiter, validateParams(idParamSchema), getPersonalObjectiveById);
router.put('/:id', generalRateLimiter, validate(updatePersonalObjectiveSchema), validateParams(idParamSchema), updatePersonalObjective);
router.delete('/:id', generalRateLimiter, validateParams(idParamSchema), deletePersonalObjective);

export default router;

