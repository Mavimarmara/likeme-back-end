import { Router } from 'express';
import {
  getQuestions,
  getQuestion,
  createAnswer,
  getUserAnswersList,
  getUserAnswer,
  getCompleteAnamnesis,
  getUserScoresController,
} from '@/controllers/anamnesis/anamnesisController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Anamnesis
 *   description: Endpoints para gerenciamento de anamnesis clínica com suporte a i18n
 */

// GET /api/anamnesis/questions - Lista todas as perguntas com traduções
router.get('/questions', getQuestions);

// GET /api/anamnesis/questions/:key - Busca uma pergunta específica
router.get('/questions/:key', getQuestion);

// GET /api/anamnesis/complete - Busca anamnesis completa (query Prisma completa)
router.get('/complete', getCompleteAnamnesis);

// POST /api/anamnesis/answers - Cria ou atualiza resposta do usuário
router.post('/answers', createAnswer);

// GET /api/anamnesis/answers/user/:userId - Busca todas as respostas de um usuário
router.get('/answers/user/:userId', getUserAnswersList);

// GET /api/anamnesis/answers/user/:userId/question/:questionConceptId - Busca resposta específica
router.get('/answers/user/:userId/question/:questionConceptId', getUserAnswer);

// GET /api/anamnesis/scores/user/:userId - Calcula scores de mental e physical
router.get('/scores/user/:userId', getUserScoresController);

export default router;

