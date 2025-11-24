import { AmityUserFeedResponse, AmityUserFeedData, AmityPost } from '@/types/amity';

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

export const normalizeAmityResponse = (
  apiResponse: AmityUserFeedResponse | AmityUserFeedData | undefined
): { feedData: AmityUserFeedData; status: string } => {
  if (!apiResponse) {
    return { feedData: {}, status: 'ok' };
  }

  if ('data' in apiResponse && apiResponse.data) {
    return {
      feedData: apiResponse.data,
      status: apiResponse.status || 'ok',
    };
  }

  if ('posts' in apiResponse) {
    return {
      feedData: apiResponse as AmityUserFeedData,
      status: 'ok',
    };
  }

  return { feedData: {}, status: 'ok' };
};

export const groupPollOptions = (
  posts: AmityPost[],
  postChildren: AmityPost[]
): AmityPost[] => {
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

  childrenMap.forEach((children) => {
    children.sort((a, b) => {
      const seqA = a.sequenceNumber ?? 0;
      const seqB = b.sequenceNumber ?? 0;
      return seqA - seqB;
    });
  });

  return posts.map((post) => {
    if (post.structureType === 'poll' && post.postId) {
      const pollOptions = childrenMap.get(post.postId) || [];
      
      const sortedOptions = [...pollOptions].sort((a, b) => {
        const seqA = a.sequenceNumber ?? 0;
        const seqB = b.sequenceNumber ?? 0;
        return seqA - seqB;
      });
      
      return {
        ...post,
        pollOptions: sortedOptions.length > 0 ? sortedOptions : undefined,
      };
    }
    
    return post;
  });
};

export const buildAmityFeedResponse = (
  feedData: AmityUserFeedData,
  status: string,
  page: number,
  limit: number
): AmityUserFeedResponse & { pagination?: { page: number; limit: number; total: number; totalPages: number } } => {
  const posts = feedData.posts ?? [];
  const postChildren = feedData.postChildren ?? [];
  const paging = feedData.paging ?? {};

  const postsWithPollOptions = groupPollOptions(posts, postChildren);

  return {
    status,
    data: {
      posts: postsWithPollOptions,
      postChildren: [],
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






