import { Router } from 'express';
import {
  listCommunities,
  getMyPosts,
  getPublicCommunityPosts,
} from '@/controllers/community/communityController';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas de comunidades (v3 API com autenticação Bearer)
router.get('/', listCommunities); // Lista comunidades v3
router.get('/feed', getMyPosts); // Feed do usuário - posts aos quais tem acesso (v3/posts/list)
router.get('/posts', getPublicCommunityPosts); // Posts globais (feed público v3)

export default router;

