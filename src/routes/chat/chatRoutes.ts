import { Router } from 'express';
import {
  getChannels,
  getChannelMessages,
  sendMessage,
  leaveChannel,
  blockUser,
  unblockUser,
  getBlockedUsers,
} from '@/controllers/chat/chatController';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/channels', getChannels);
router.get('/channels/:channelId/messages', getChannelMessages);
router.post('/channels/:channelId/messages', sendMessage);
router.delete('/channels/:channelId/leave', leaveChannel);
router.post('/users/block', blockUser);
router.delete('/users/block/:targetUserId', unblockUser);
router.get('/users/blocked', getBlockedUsers);

export default router;
