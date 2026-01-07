import { Request, Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import {
  getAnamneseQuestions,
  getQuestionByKey,
  createOrUpdateUserAnswer,
  getUserAnswers,
  getUserAnswerByQuestion,
  getCompleteAnamneseByLocale,
} from '@/services/anamnese/anamneseService';
import type { CreateUserAnswerData } from '@/interfaces/anamnese';

/**
 * @swagger
 * /api/anamnese/questions:
 *   get:
 *     summary: Lista todas as perguntas da anamnese com traduções
 *     tags: [Anamnese]
 *     parameters:
 *       - in: query
 *         name: locale
 *         required: true
 *         schema:
 *           type: string
 *           example: "pt-BR"
 *         description: Locale para tradução (ex: pt-BR, en-US)
 *     responses:
 *       200:
 *         description: Lista de perguntas com textos e opções traduzidas
 */
export const getQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const locale = req.query.locale as string;

    if (!locale) {
      sendError(res, 'Locale parameter is required', 400);
      return;
    }

    const questions = await getAnamneseQuestions(locale);
    sendSuccess(res, questions, 'Questions retrieved successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Error retrieving questions', 500);
  }
};

/**
 * @swagger
 * /api/anamnese/questions/{key}:
 *   get:
 *     summary: Busca uma pergunta específica por key
 *     tags: [Anamnese]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Key da pergunta
 *       - in: query
 *         name: locale
 *         required: true
 *         schema:
 *           type: string
 *           example: "pt-BR"
 *         description: Locale para tradução
 *     responses:
 *       200:
 *         description: Pergunta encontrada
 *       404:
 *         description: Pergunta não encontrada
 */
export const getQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const locale = req.query.locale as string;

    if (!locale) {
      sendError(res, 'Locale parameter is required', 400);
      return;
    }

    const question = await getQuestionByKey(key, locale);

    if (!question) {
      sendError(res, 'Question not found', 404);
      return;
    }

    sendSuccess(res, question, 'Question retrieved successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Error retrieving question', 500);
  }
};

/**
 * @swagger
 * /api/anamnese/answers:
 *   post:
 *     summary: Cria ou atualiza uma resposta do usuário
 *     tags: [Anamnese]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - questionConceptId
 *             properties:
 *               userId:
 *                 type: string
 *               questionConceptId:
 *                 type: string
 *               answerOptionId:
 *                 type: string
 *                 nullable: true
 *               answerText:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Resposta criada/atualizada com sucesso
 *       400:
 *         description: Dados inválidos
 */
export const createAnswer = async (req: Request, res: Response): Promise<void> => {
  try {
    const data: CreateUserAnswerData = req.body;

    if (!data.userId || !data.questionConceptId) {
      sendError(res, 'userId and questionConceptId are required', 400);
      return;
    }

    const answer = await createOrUpdateUserAnswer(data);
    sendSuccess(res, answer, 'Answer created/updated successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Error creating answer', 400);
  }
};

/**
 * @swagger
 * /api/anamnese/answers/user/{userId}:
 *   get:
 *     summary: Busca todas as respostas de um usuário
 *     tags: [Anamnese]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário
 *       - in: query
 *         name: locale
 *         required: false
 *         schema:
 *           type: string
 *           example: "pt-BR"
 *         description: Locale para tradução (opcional)
 *     responses:
 *       200:
 *         description: Lista de respostas do usuário
 */
export const getUserAnswersList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const locale = req.query.locale as string | undefined;

    const answers = await getUserAnswers(userId, locale);
    sendSuccess(res, answers, 'User answers retrieved successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Error retrieving user answers', 500);
  }
};

/**
 * @swagger
 * /api/anamnese/answers/user/{userId}/question/{questionConceptId}:
 *   get:
 *     summary: Busca uma resposta específica do usuário para uma pergunta
 *     tags: [Anamnese]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário
 *       - in: path
 *         name: questionConceptId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do conceito da pergunta
 *     responses:
 *       200:
 *         description: Resposta encontrada
 *       404:
 *         description: Resposta não encontrada
 */
export const getUserAnswer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, questionConceptId } = req.params;

    const answer = await getUserAnswerByQuestion(userId, questionConceptId);

    if (!answer) {
      sendError(res, 'Answer not found', 404);
      return;
    }

    sendSuccess(res, answer, 'Answer retrieved successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Error retrieving answer', 500);
  }
};

/**
 * @swagger
 * /api/anamnese/complete:
 *   get:
 *     summary: Busca anamnese completa com todas as perguntas, textos e opções traduzidas
 *     tags: [Anamnese]
 *     parameters:
 *       - in: query
 *         name: locale
 *         required: true
 *         schema:
 *           type: string
 *           example: "pt-BR"
 *         description: Locale para tradução
 *     responses:
 *       200:
 *         description: Anamnese completa com traduções
 */
export const getCompleteAnamnese = async (req: Request, res: Response): Promise<void> => {
  try {
    const locale = req.query.locale as string;

    if (!locale) {
      sendError(res, 'Locale parameter is required', 400);
      return;
    }

    const anamnese = await getCompleteAnamneseByLocale(locale);
    sendSuccess(res, anamnese, 'Complete anamnese retrieved successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Error retrieving complete anamnese', 500);
  }
};

