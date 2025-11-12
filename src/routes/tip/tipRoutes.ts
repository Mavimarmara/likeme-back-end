import { Router } from 'express';
import { createOrUpdateTip, deleteTip, getTips } from '@/controllers/tip/tipController';
import { generalRateLimiter } from '@/middleware/rateLimiter';
import { validate, validateParams } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { upsertTipSchema, idParamSchema } from '@/utils/validationSchemas';

const router = Router();

router.get('/', generalRateLimiter, getTips);
router.post(
  '/',
  authenticateToken,
  requireAuth,
  generalRateLimiter,
  validate(upsertTipSchema),
  createOrUpdateTip,
);
router.delete(
  '/:id',
  authenticateToken,
  requireAuth,
  generalRateLimiter,
  validateParams(idParamSchema),
  deleteTip,
);

export default router;

