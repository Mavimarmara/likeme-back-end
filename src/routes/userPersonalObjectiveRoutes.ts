import { Router } from 'express';
import {
  createUserPersonalObjective,
  getUserPersonalObjective,
  getAllUserPersonalObjectives,
  deleteUserPersonalObjective,
  getMyObjectives,
  addMyObjective,
  removeMyObjective,
} from '@/controllers/userPersonalObjectiveController';
import { createUserPersonalObjectiveSchema, userPersonalObjectiveParamsSchema, objectiveIdParamSchema, addMyObjectiveSchema } from '@/utils/validationSchemas';
import { validate } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);
router.use(requireAuth);

router.get('/me/objectives', generalRateLimiter, getMyObjectives);
router.post('/me/objectives', generalRateLimiter, validate(addMyObjectiveSchema), addMyObjective);
router.delete('/me/objectives/:objectiveId', generalRateLimiter, validate(objectiveIdParamSchema, 'params'), removeMyObjective);

router.post('/', generalRateLimiter, validate(createUserPersonalObjectiveSchema), createUserPersonalObjective);
router.get('/', generalRateLimiter, getAllUserPersonalObjectives);
router.get('/:userId/:objectiveId', generalRateLimiter, validate(userPersonalObjectiveParamsSchema, 'params'), getUserPersonalObjective);
router.delete('/:userId/:objectiveId', generalRateLimiter, validate(userPersonalObjectiveParamsSchema, 'params'), deleteUserPersonalObjective);

export default router;

