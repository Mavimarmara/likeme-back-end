import { Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { sendError, sendSuccess } from '@/utils/response';
import { communityService } from '@/services/communityService';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const buildPaginationParams = (query: unknown) => {
  const page = parseInt((query as { page?: string }).page as string, 10) || DEFAULT_PAGE;
  const limit = parseInt((query as { limit?: string }).limit as string, 10) || DEFAULT_LIMIT;
  const search = (query as { search?: string }).search;
  return { page, limit, search };
};

const handleError = (res: Response, error: unknown, operation: string): void => {
  console.error(`${operation} error:`, error);
  const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
  sendError(res, `Erro ao ${operation}: ${errorMessage}`);
};

export const getUserFeed = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, search } = buildPaginationParams(req.query);
    const userId = req.user?.id;

    const feed = await communityService.getUserFeed(userId, page, limit, undefined, search);
    
    sendSuccess(res, feed, 'Feed do usuário obtido com sucesso');
  } catch (error) {
    handleError(res, error, 'obter feed do usuário');
  }
};

export const votePoll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { pollId } = req.params;
    const { answerIds } = req.body;
    const userId = req.user?.id;

    if (!pollId) {
      sendError(res, 'pollId é obrigatório', 400);
      return;
    }

    if (!answerIds || !Array.isArray(answerIds) || answerIds.length === 0) {
      sendError(res, 'answerIds é obrigatório e deve ser um array não vazio', 400);
      return;
    }

    const result = await communityService.votePoll(userId, pollId, answerIds);

    if (!result.success) {
      sendError(res, result.error || 'Erro ao votar em poll', 400);
      return;
    }

    sendSuccess(res, result.data, 'Voto registrado com sucesso');
  } catch (error) {
    handleError(res, error, 'votar em poll');
  }
};
