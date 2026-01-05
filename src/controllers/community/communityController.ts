import { Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { sendError, sendSuccess } from '@/utils/response';
import { communityService } from '@/services/community/communityService';
import type { FeedFilterOptions, FeedOrderBy } from '@/interfaces/community/community';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const buildPaginationParams = (query: unknown) => {
  const page = parseInt((query as { page?: string }).page as string, 10) || DEFAULT_PAGE;
  const limit = parseInt((query as { limit?: string }).limit as string, 10) || DEFAULT_LIMIT;
  const search = (query as { search?: string }).search;
  return { page, limit, search };
};

const parseListParam = (value: unknown): string[] | undefined => {
  if (!value) return undefined;
  const toArray = Array.isArray(value) ? value : String(value).split(',');
  const parsed = toArray
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
  return parsed.length > 0 ? parsed : undefined;
};

const parseDateParam = (value: unknown): Date | undefined | 'invalid' => {
  if (!value) return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return 'invalid';
  }
  return date;
};

const buildFeedFilters = (query: unknown): { filters?: FeedFilterOptions; error?: string } => {
  const params = query as Record<string, unknown>;
  const filters: FeedFilterOptions = {};

  const postTypes = parseListParam(params.postTypes ?? params.postType);
  if (postTypes) {
    filters.postTypes = postTypes.map((type) => type.toLowerCase());
  }

  const authorIds = parseListParam(params.authorIds ?? params.authorId);
  if (authorIds) {
    filters.authorIds = authorIds;
  }

  const startDate = parseDateParam(params.startDate);
  if (startDate === 'invalid') {
    return { error: 'startDate inválido. Utilize formato ISO 8601.' };
  }
  if (startDate) {
    filters.startDate = startDate;
  }

  const endDate = parseDateParam(params.endDate);
  if (endDate === 'invalid') {
    return { error: 'endDate inválido. Utilize formato ISO 8601.' };
  }
  if (endDate) {
    filters.endDate = endDate;
  }

  const allowedOrderBy: FeedOrderBy[] = ['createdAt', 'updatedAt', 'reactionsCount'];
  if (params.orderBy && typeof params.orderBy === 'string') {
    if (!allowedOrderBy.includes(params.orderBy as FeedOrderBy)) {
      return { error: `orderBy inválido. Utilize um dos valores: ${allowedOrderBy.join(', ')}.` };
    }
    filters.orderBy = params.orderBy as FeedOrderBy;
  }

  if (params.order && typeof params.order === 'string') {
    const normalizedOrder = params.order.toLowerCase();
    if (!['asc', 'desc'].includes(normalizedOrder)) {
      return { error: 'order inválido. Utilize "asc" ou "desc".' };
    }
    filters.order = normalizedOrder as 'asc' | 'desc';
  }

  return { filters: Object.keys(filters).length > 0 ? filters : undefined };
};

const handleError = (res: Response, error: unknown, operation: string): void => {
  console.error(`${operation} error:`, error);
  const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
  sendError(res, `Erro ao ${operation}: ${errorMessage}`);
};

export const listCommunities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page, limit } = buildPaginationParams(req.query);
    const userId = req.user?.id;
    const { sortBy, includeDeleted } = req.query;

    const sortByParam = typeof sortBy === 'string' ? sortBy : undefined;
    const includeDeletedParam = typeof includeDeleted === 'string' 
      ? (includeDeleted === 'true' || includeDeleted === '1')
      : Boolean(includeDeleted);

    const result = await communityService.listCommunities(
      userId,
      page,
      limit,
      sortByParam,
      includeDeletedParam
    );

    if (!result.success) {
      sendError(res, result.error || 'Erro ao listar comunidades', 400);
      return;
    }

    sendSuccess(res, result.data, 'Comunidades listadas com sucesso');
  } catch (error) {
    handleError(res, error, 'listar comunidades');
  }
};

export const getUserFeed = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, search } = buildPaginationParams(req.query);
    const userId = req.user?.id;
    const { filters, error } = buildFeedFilters(req.query);

    if (error) {
      sendError(res, error, 400);
      return;
    }

    const feed = await communityService.getUserFeed(userId, page, limit, undefined, search, filters);
    
    sendSuccess(res, feed, 'Feed do usuário obtido com sucesso');
  } catch (error) {
    handleError(res, error, 'obter feed do usuário');
  }
};

export const votePoll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { pollId: pollIdParam } = req.params;
    const { answerIds, pollId: pollIdBody } = req.body;
    const userId = req.user?.id;

    const pollId = pollIdBody || pollIdParam;

    if (!pollId) {
      sendError(res, 'pollId é obrigatório (pode ser enviado no body ou como parâmetro)', 400);
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

export const getChannels = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { types } = req.query;

    let channelTypes: ('conversation' | 'broadcast' | 'live' | 'community')[] | undefined;
    if (types) {
      const validTypes = ['conversation', 'broadcast', 'live', 'community'];
      if (typeof types === 'string') {
        const type = types as 'conversation' | 'broadcast' | 'live' | 'community';
        if (validTypes.includes(type)) {
          channelTypes = [type];
        }
      } else if (Array.isArray(types)) {
        channelTypes = types
          .filter((t): t is 'conversation' | 'broadcast' | 'live' | 'community' => 
            typeof t === 'string' && validTypes.includes(t as any)
          );
      }
    }

    const channels = await communityService.getChannels(userId, channelTypes);
    
    sendSuccess(res, channels, 'Channels obtidos com sucesso');
  } catch (error) {
    handleError(res, error, 'obter channels');
  }
};

export const addCommentReaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { commentId } = req.params;
    const { reactionName } = req.body;

    if (!commentId) {
      sendError(res, 'commentId é obrigatório', 400);
      return;
    }

    const reaction = reactionName || 'like';
    const result = await communityService.addCommentReaction(userId, commentId, reaction);

    if (!result.success) {
      sendError(res, result.error || 'Erro ao adicionar reação ao comentário', 400);
      return;
    }

    sendSuccess(res, result, result.message || 'Reação adicionada com sucesso');
  } catch (error) {
    handleError(res, error, 'adicionar reação ao comentário');
  }
};

export const removeCommentReaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { commentId } = req.params;
    const { reactionName } = req.body;

    if (!commentId) {
      sendError(res, 'commentId é obrigatório', 400);
      return;
    }

    const reaction = reactionName || 'like';
    const result = await communityService.removeCommentReaction(userId, commentId, reaction);

    if (!result.success) {
      sendError(res, result.error || 'Erro ao remover reação do comentário', 400);
      return;
    }

    sendSuccess(res, result, result.message || 'Reação removida com sucesso');
  } catch (error) {
    handleError(res, error, 'remover reação do comentário');
  }
};

