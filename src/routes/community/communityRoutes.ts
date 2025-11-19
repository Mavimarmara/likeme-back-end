import { Router } from 'express';
import {
  listCommunities,
  getPublicCommunityPosts,
} from '@/controllers/community/communityController';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas de comunidades (v3 API com autenticação Bearer)
router.get('/', listCommunities); // Lista comunidades v3
router.get('/posts', getPublicCommunityPosts); // Posts globais (feed público v3)

export default router;

