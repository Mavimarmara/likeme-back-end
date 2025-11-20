import { Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { AmityGlobalFeedResponse, AmityGlobalFeedData } from '@/types/amity';
import { sendError, sendSuccess } from '@/utils/response';
import { socialPlusClient } from '@/utils/socialPlus';
import { getUserAccessToken } from '@/utils/userToken';
import { normalizeAmityResponse, buildAmityFeedResponse } from '@/utils/amityResponseNormalizer';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const buildPaginationParams = (query: any) => {
  const page = parseInt(query.page as string, 10) || DEFAULT_PAGE;
  const limit = parseInt(query.limit as string, 10) || DEFAULT_LIMIT;
  return { page, limit };
};

const handleError = (res: Response, error: unknown, operation: string): void => {
  console.error(`${operation} error:`, error);
  sendError(res, `Erro ao ${operation}`);
};

const buildSocialPlusErrorMessage = (fallbackMessage: string, socialPlusError?: string) => {
  if (socialPlusError) {
    return `${fallbackMessage}: ${socialPlusError}`;
  }
  return fallbackMessage;
};

export const getUserFeed = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page, limit } = buildPaginationParams(req.query);

    const { token: userAccessToken } = await getUserAccessToken(req, false);

    const response = await socialPlusClient.getGlobalFeed({
      page,
      limit,
      userAccessToken: userAccessToken || undefined,
    });

    if (!response.success) {
      sendError(res, buildSocialPlusErrorMessage('Erro ao listar posts públicos', response.error));
      return;
    }

    const apiResponse = response.data as AmityGlobalFeedResponse | AmityGlobalFeedData | undefined;
    
    if (apiResponse) {
      const postsBeforeNormalize = ('data' in apiResponse && apiResponse.data?.posts) || ('posts' in apiResponse ? apiResponse.posts : undefined);
      console.log('[Community] response.data.posts (getUserFeed):', JSON.stringify(postsBeforeNormalize, null, 2));
      console.log(`[Community] Total de posts (getUserFeed): ${postsBeforeNormalize?.length || 0}`);
    }
    
    const { feedData, status } = normalizeAmityResponse(apiResponse);
    
    console.log('[Community] feedData.posts (após normalização):', JSON.stringify(feedData.posts, null, 2));
    console.log(`[Community] Total de posts (após normalização): ${feedData.posts?.length || 0}`);
    
    const responseData = buildAmityFeedResponse(feedData, status, page, limit);
    
    sendSuccess(res, responseData, 'Posts globais obtidos com sucesso');
  } catch (error) {
    handleError(res, error, 'listar posts globais');
  }
};
