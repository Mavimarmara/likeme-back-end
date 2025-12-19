import { Router } from 'express';
import { authenticateToken } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';
import { validate } from '@/middleware/validation';
import {
  createActivitySchema,
  updateActivitySchema,
} from '@/utils/validationSchemas';
import {
  createActivity,
  getActivityById,
  getAllActivities,
  updateActivity,
  deleteActivity,
} from '@/controllers/activity/activityController';

const router = Router();

router.post(
  '/',
  authenticateToken,
  generalRateLimiter,
  validate(createActivitySchema),
  createActivity
);

router.get(
  '/',
  authenticateToken,
  generalRateLimiter,
  getAllActivities
);

router.get(
  '/:id',
  authenticateToken,
  generalRateLimiter,
  getActivityById
);

router.put(
  '/:id',
  authenticateToken,
  generalRateLimiter,
  validate(updateActivitySchema),
  updateActivity
);

router.delete(
  '/:id',
  authenticateToken,
  generalRateLimiter,
  deleteActivity
);

export default router;
