import { Router } from 'express';
import { quote } from '@/controllers/shipping/shippingController';
import { validateQuery } from '@/middleware/validation';
import { shippingQuoteQuerySchema } from '@/utils/validationSchemas';
import { generalRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

router.get(
  '/quote',
  generalRateLimiter,
  validateQuery(shippingQuoteQuerySchema),
  quote,
);

export default router;
