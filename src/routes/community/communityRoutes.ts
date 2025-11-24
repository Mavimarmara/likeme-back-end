import { Router } from 'express';
import { getUserFeed, votePoll, getChannels } from '@/controllers/community/communityController';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/feed', getUserFeed);
router.get('/channels', getChannels);
router.put('/polls/:pollId/votes', votePoll);

export default router;

