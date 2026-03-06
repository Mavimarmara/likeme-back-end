import { Router } from 'express';
import { getAllCategories } from '@/controllers/category/categoryController';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);
router.use(requireAuth);

router.get('/', generalRateLimiter, getAllCategories);

export default router;
