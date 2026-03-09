import { Router } from 'express';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';
import { uploadAny } from '@/middleware/upload';
import { uploadProviderImage } from '@/controllers/upload/uploadController';

const router = Router();

router.use(authenticateToken);
router.use(requireAuth);

router.post('/image', generalRateLimiter, uploadAny, uploadProviderImage);

export default router;

