import { Router } from 'express';
import { getUserFeed } from '@/controllers/community/communityController';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/feed', getUserFeed);

export default router;

