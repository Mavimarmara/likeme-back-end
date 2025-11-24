import { Router } from 'express';
import { getUserFeed, votePoll, getChannels, addCommentReaction, removeCommentReaction } from '@/controllers/community/communityController';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/feed', getUserFeed);
router.get('/channels', getChannels);
router.put('/polls/:pollId/votes', votePoll);
router.post('/comments/:commentId/reactions', addCommentReaction);
router.delete('/comments/:commentId/reactions', removeCommentReaction);

export default router;

