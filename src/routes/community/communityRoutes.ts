import { Router } from 'express';
import { getUserFeed, votePoll } from '@/controllers/community/communityController';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/feed', getUserFeed);
router.put('/polls/:pollId/votes', votePoll);

export default router;

