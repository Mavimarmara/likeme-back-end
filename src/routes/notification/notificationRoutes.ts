import { Router } from 'express';
import {
  registerToken,
  unregisterToken,
  sendNotification,
} from '@/controllers/notification/notificationController';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);
router.use(requireAuth);

router.post('/register-token', generalRateLimiter, registerToken);
router.post('/unregister-token', generalRateLimiter, unregisterToken);
router.post('/send', generalRateLimiter, sendNotification);

export default router;
