import { Router } from 'express';
import {
  getQuestions,
  getQuestion,
  createAnswer,
  getUserAnswersList,
  getUserAnswer,
  getCompleteAnamnesis,
  getUserScoresController,
  getUserMarkersController,
} from '@/controllers/anamnesis/anamnesisController';
import {
  importAnamnesisFromCSV,
  downloadImportTemplate,
} from '@/controllers/anamnesis/anamnesisImportController';
import { generalRateLimiter } from '@/middleware/rateLimiter';
import { uploadCSV } from '@/middleware/upload';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Anamnesis
 *   description: Endpoints para gerenciamento de anamnesis clínica com suporte a i18n
 */

// Rotas de importação CSV (devem vir antes das rotas com parâmetros)
// POST /api/anamnesis/import/csv - Importa perguntas de anamnese via CSV
router.post('/import/csv', generalRateLimiter, uploadCSV, importAnamnesisFromCSV);

// GET /api/anamnesis/import/template - Baixa template CSV para importação
router.get('/import/template', generalRateLimiter, downloadImportTemplate);

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

// GET /api/anamnesis/markers/user/:userId - Calcula markers individuais
router.get('/markers/user/:userId', getUserMarkersController);

export default router;

