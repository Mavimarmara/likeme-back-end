import { Router } from 'express';
import {
  createAd,
  getAdById,
  getAllAds,
  updateAd,
  deleteAd,
} from '@/controllers/ad/adController';
import {
  createAdSchema,
  updateAdSchema,
  idParamSchema,
} from '@/utils/validationSchemas';
import { validate, validateParams } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);
router.use(requireAuth);

router.post('/', generalRateLimiter, validate(createAdSchema), createAd);
router.get('/', generalRateLimiter, getAllAds);
router.get('/:id', generalRateLimiter, validateParams(idParamSchema), getAdById);
router.put('/:id', generalRateLimiter, validate(updateAdSchema), validateParams(idParamSchema), updateAd);
router.delete('/:id', generalRateLimiter, validateParams(idParamSchema), deleteAd);

export default router;
