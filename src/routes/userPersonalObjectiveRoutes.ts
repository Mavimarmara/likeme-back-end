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
import { validate, validateParams } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);
router.use(requireAuth);

router.get('/me/objectives', generalRateLimiter, getMyObjectives);
router.post('/me/objectives', generalRateLimiter, validate(addMyObjectiveSchema), addMyObjective);
router.delete('/me/objectives/:objectiveId', generalRateLimiter, validateParams(objectiveIdParamSchema), removeMyObjective);

router.post('/', generalRateLimiter, validate(createUserPersonalObjectiveSchema), createUserPersonalObjective);
router.get('/', generalRateLimiter, getAllUserPersonalObjectives);
router.get('/:userId/:objectiveId', generalRateLimiter, validateParams(userPersonalObjectiveParamsSchema), getUserPersonalObjective);
router.delete('/:userId/:objectiveId', generalRateLimiter, validateParams(userPersonalObjectiveParamsSchema), deleteUserPersonalObjective);

export default router;

