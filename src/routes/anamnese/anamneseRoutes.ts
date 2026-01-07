import { Router } from 'express';
import {
  getQuestions,
  getQuestion,
  createAnswer,
  getUserAnswersList,
  getUserAnswer,
  getCompleteAnamnese,
} from '@/controllers/anamnese/anamneseController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Anamnese
 *   description: Endpoints para gerenciamento de anamnese clínica com suporte a i18n
 */

// GET /api/anamnese/questions - Lista todas as perguntas com traduções
router.get('/questions', getQuestions);

// GET /api/anamnese/questions/:key - Busca uma pergunta específica
router.get('/questions/:key', getQuestion);

// GET /api/anamnese/complete - Busca anamnese completa (query Prisma completa)
router.get('/complete', getCompleteAnamnese);

// POST /api/anamnese/answers - Cria ou atualiza resposta do usuário
router.post('/answers', createAnswer);

// GET /api/anamnese/answers/user/:userId - Busca todas as respostas de um usuário
router.get('/answers/user/:userId', getUserAnswersList);

// GET /api/anamnese/answers/user/:userId/question/:questionConceptId - Busca resposta específica
router.get('/answers/user/:userId/question/:questionConceptId', getUserAnswer);

export default router;

