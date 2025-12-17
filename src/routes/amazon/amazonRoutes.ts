import { Router } from 'express';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';
import { validateQuery, validateParams } from '@/middleware/validation';
import { 
  getProductByUrl,
  getProductByAd,
} from '@/controllers/amazon/amazonController';
import {
  externalUrlQuerySchema,
  adIdParamSchema,
} from '@/utils/validationSchemas';

const router = Router();

router.use(authenticateToken);
router.use(requireAuth);

// GET /api/amazon/product-by-url?externalUrl=...
router.get(
  '/product-by-url',
  generalRateLimiter,
  validateQuery(externalUrlQuerySchema),
  getProductByUrl
);

// GET /api/amazon/product-by-ad/:adId
router.get(
  '/product-by-ad/:adId',
  generalRateLimiter,
  validateParams(adIdParamSchema),
  getProductByAd
);

export default router;
