import { Router } from 'express';
import {
  listCommunities,
  getCommunityById,
  addMember,
  removeMember,
  listMembers,
} from '@/controllers/communityController';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas de comunidades (apenas leitura - criação via dashboard)
router.get('/', listCommunities);
router.get('/:id', getCommunityById);

// Rotas de membros
router.post('/:id/members', addMember);
router.get('/:id/members', listMembers);
router.delete('/:id/members/:userId', removeMember);

export default router;

