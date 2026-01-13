import { Request, Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import {
  getAnamnesisQuestions,
  getQuestionByKey,
  createOrUpdateUserAnswer,
  getUserAnswers,
  getUserAnswerByQuestion,
  getCompleteAnamnesisByLocale,
} from '@/services/anamnesis/anamnesisService';
import type { CreateUserAnswerData } from '@/interfaces/anamnesis';

/**
 * @swagger
 * /api/anamnesis/questions:
 *   get:
 *     summary: Lista todas as perguntas da anamnesis com traduções
 *     tags: [Anamnesis]
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

    const questions = await getAnamnesisQuestions(locale);
    sendSuccess(res, questions, 'Questions retrieved successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Error retrieving questions', 500);
  }
};

/**
 * @swagger
 * /api/anamnesis/questions/{key}:
 *   get:
 *     summary: Busca uma pergunta específica por key
 *     tags: [Anamnesis]
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
 * /api/anamnesis/answers:
 *   post:
 *     summary: Cria ou atualiza uma resposta do usuário
 *     tags: [Anamnesis]
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
 * /api/anamnesis/answers/user/{userId}:
 *   get:
 *     summary: Busca todas as respostas de um usuário
 *     tags: [Anamnesis]
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
 * /api/anamnesis/answers/user/{userId}/question/{questionConceptId}:
 *   get:
 *     summary: Busca uma resposta específica do usuário para uma pergunta
 *     tags: [Anamnesis]
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
 * /api/anamnesis/complete:
 *   get:
 *     summary: Busca anamnesis completa com todas as perguntas, textos e opções traduzidas
 *     tags: [Anamnesis]
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
 *         description: Anamnesis completa com traduções
 */
export const getCompleteAnamnesis = async (req: Request, res: Response): Promise<void> => {
  try {
    const locale = req.query.locale as string;

    if (!locale) {
      sendError(res, 'Locale parameter is required', 400);
      return;
    }

    const anamnesis = await getCompleteAnamnesisByLocale(locale);
    sendSuccess(res, anamnesis, 'Complete anamnesis retrieved successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Error retrieving complete anamnesis', 500);
  }
};

