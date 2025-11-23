import { AmityUserFeedResponse, AmityUserFeedData, AmityPost } from '@/types/amity';

/**
 * Filtra posts baseado em busca nos campos de texto e título
 * @param posts - Array de posts para filtrar
 * @param searchTerm - Termo de busca
 * @returns Array de posts filtrados
 */
export const filterPostsBySearch = (posts: AmityPost[] | undefined, searchTerm?: string): AmityPost[] => {
  if (!posts || !searchTerm || searchTerm.trim() === '') {
    return posts || [];
  }

  const normalizedSearch = searchTerm.trim().toLowerCase();

  return posts.filter((post) => {
    const title = post.data?.title?.toLowerCase() || '';
    const text = post.data?.text?.toLowerCase() || '';
    
    return title.includes(normalizedSearch) || text.includes(normalizedSearch);
  });
};

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
 * Agrupa as opções de poll (postChildren) dentro dos posts principais
 * @param posts - Array de posts principais
 * @param postChildren - Array de postChildren (opções de poll)
 * @returns Array de posts com pollOptions agrupadas
 */
export const groupPollOptions = (
  posts: AmityPost[],
  postChildren: AmityPost[]
): AmityPost[] => {
  // Cria um mapa de postChildren por parentPostId
  const childrenMap = new Map<string, AmityPost[]>();
  
  postChildren.forEach((child) => {
    const parentId = child.parentPostId;
    if (parentId) {
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(child);
    }
  });

  // Ordena os children por sequenceNumber antes de adicionar ao post
  childrenMap.forEach((children) => {
    children.sort((a, b) => {
      const seqA = a.sequenceNumber ?? 0;
      const seqB = b.sequenceNumber ?? 0;
      return seqA - seqB;
    });
  });

  // Adiciona pollOptions aos posts que são polls
  return posts.map((post) => {
    // Se o post é um poll e tem children, adiciona as opções
    if (post.structureType === 'poll' && post.postId) {
      const pollOptions = childrenMap.get(post.postId) || [];
      return {
        ...post,
        pollOptions: pollOptions.length > 0 ? pollOptions : undefined,
      };
    }
    return post;
  });
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
  const postChildren = feedData.postChildren ?? [];
  const paging = feedData.paging ?? {};

  // Agrupa as opções de poll dentro dos posts principais
  const postsWithPollOptions = groupPollOptions(posts, postChildren);

  return {
    status,
    data: {
      posts: postsWithPollOptions,
      postChildren: [], // Remove postChildren da resposta, pois já estão agrupados nos posts
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






