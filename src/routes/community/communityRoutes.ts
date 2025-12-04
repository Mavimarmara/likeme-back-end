import { Router } from 'express';
import { listCommunities, getUserFeed, votePoll, getChannels, addCommentReaction, removeCommentReaction, getProviderUser } from '@/controllers/community/communityController';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', listCommunities);
router.get('/feed', getUserFeed);
router.get('/channels', getChannels);
router.get('/provider/:userId', getProviderUser);
router.put('/polls/:pollId/votes', votePoll);
router.post('/comments/:commentId/reactions', addCommentReaction);
router.delete('/comments/:commentId/reactions', removeCommentReaction);

export default router;

