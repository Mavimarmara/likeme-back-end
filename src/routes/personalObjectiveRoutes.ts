import { Router } from 'express';
import {
  createPersonalObjective,
  getPersonalObjectiveById,
  getAllPersonalObjectives,
  updatePersonalObjective,
  deletePersonalObjective,
} from '@/controllers/personalObjectiveController';
import { createPersonalObjectiveSchema, updatePersonalObjectiveSchema, idParamSchema } from '@/utils/validationSchemas';
import { validate } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);
router.use(requireAuth);

router.post('/', generalRateLimiter, validate(createPersonalObjectiveSchema), createPersonalObjective);
router.get('/', generalRateLimiter, getAllPersonalObjectives);
router.get('/:id', generalRateLimiter, validate(idParamSchema, 'params'), getPersonalObjectiveById);
router.put('/:id', generalRateLimiter, validate(updatePersonalObjectiveSchema), validate(idParamSchema, 'params'), updatePersonalObjective);
router.delete('/:id', generalRateLimiter, validate(idParamSchema, 'params'), deletePersonalObjective);

export default router;

