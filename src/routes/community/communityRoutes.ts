import { Router } from 'express';
import { listCommunities, getUserFeed, votePoll, getChannels, getChannelMessages, leaveChannel, joinCommunity, blockUser, unblockUser, getBlockedUsers, addCommentReaction, removeCommentReaction } from '@/controllers/community/communityController';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', listCommunities);
router.get('/feed', getUserFeed);
router.get('/channels', getChannels);
router.get('/channels/:channelId/messages', getChannelMessages);
router.delete('/channels/:channelId/leave', leaveChannel);
router.post('/:communityId/join', joinCommunity);
router.post('/users/block', blockUser);
router.delete('/users/block/:targetUserId', unblockUser);
router.get('/users/blocked', getBlockedUsers);
router.put('/polls/:pollId/votes', votePoll);
router.post('/comments/:commentId/reactions', addCommentReaction);
router.delete('/comments/:commentId/reactions', removeCommentReaction);

export default router;

