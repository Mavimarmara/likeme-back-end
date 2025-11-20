import { AmityUserFeedResponse, AmityUserFeedData } from '@/types/amity';

/**
 * Normaliza a resposta da API Amity que pode vir em diferentes formatos
 * @param apiResponse - Resposta da API que pode ser AmityUserFeedResponse ou AmityUserFeedData
 * @returns Objeto normalizado com feedData e status
 */
export const normalizeAmityResponse = (
  apiResponse: AmityUserFeedResponse | AmityUserFeedData | undefined
): { feedData: AmityUserFeedData; status: string } => {
  if (!apiResponse) {
    return { feedData: {}, status: 'ok' };
  }

  // Formato: { status, data: {...} }
  if ('data' in apiResponse && apiResponse.data) {
    return {
      feedData: apiResponse.data,
      status: apiResponse.status || 'ok',
    };
  }

  // Formato: { posts, postChildren, ... } diretamente
  if ('posts' in apiResponse) {
    return {
      feedData: apiResponse as AmityUserFeedData,
      status: 'ok',
    };
  }

  return { feedData: {}, status: 'ok' };
};

/**
 * Constrói a resposta completa do feed do usuário do Amity
 * @param feedData - Dados do feed normalizados
 * @param status - Status da resposta
 * @param page - Página atual
 * @param limit - Limite de itens por página
 * @returns Resposta completa formatada
 */
export const buildAmityFeedResponse = (
  feedData: AmityUserFeedData,
  status: string,
  page: number,
  limit: number
): AmityUserFeedResponse & { pagination?: { page: number; limit: number; total: number; totalPages: number } } => {
  const posts = feedData.posts ?? [];
  const paging = feedData.paging ?? {};

  return {
    status,
    data: {
      posts: feedData.posts ?? [],
      postChildren: feedData.postChildren ?? [],
      comments: feedData.comments ?? [],
      users: feedData.users ?? [],
      files: feedData.files ?? [],
      communities: feedData.communities ?? [],
      communityUsers: feedData.communityUsers ?? [],
      categories: feedData.categories ?? [],
      paging: {
        next: paging.next,
        previous: paging.previous,
      },
    },
    pagination: {
      page,
      limit,
      total: posts.length,
      totalPages: Math.ceil(posts.length / limit),
    },
  };
};






