import { AmityUserFeedResponse, AmityUserFeedData, AmityPost, AmityPoll } from '@/types/amity';
import { socialPlusClient } from '@/clients/socialPlus/socialPlusClient';

const createPollSignature = (post: AmityPost): string | null => {
  if (post.structureType !== 'poll') {
    return null;
  }
  
  const question = post.data?.text || '';
  const pollOptions = post.pollOptions || [];
  
  if (!question && pollOptions.length === 0) {
    return null;
  }
  
  const optionsText = pollOptions
    .map(opt => opt.data?.text || '')
    .filter(text => text !== '')
    .sort()
    .join('|');
  
  return `${question}::${optionsText}`;
};

export const deduplicatePosts = (posts: AmityPost[]): AmityPost[] => {
  const seenIds = new Set<string>();
  const seenPollSignatures = new Set<string>();
  
  console.log(`[deduplicatePosts] Iniciando deduplicação de ${posts.length} posts`);
  
  const result = posts.filter((post) => {
    const id = post.postId || post._id;
    
    if (id && seenIds.has(id)) {
      console.warn(`[deduplicatePosts] Post duplicado removido por ID: ${id}`);
      return false;
    }
    
    if (post.structureType === 'poll') {
      const signature = createPollSignature(post);
      console.log(`[deduplicatePosts] Poll ${id} - signature: "${signature}"`);
      
      if (signature && seenPollSignatures.has(signature)) {
        console.warn(`[deduplicatePosts] Poll duplicada removida por conteúdo: ${id} - "${post.data?.text}"`);
        return false;
      }
      if (signature) {
        seenPollSignatures.add(signature);
        console.log(`[deduplicatePosts] Poll ${id} adicionada com signature: "${signature}"`);
      }
    }
    
    if (id) {
      seenIds.add(id);
    }
    
    return true;
  });
  
  console.log(`[deduplicatePosts] Deduplicação concluída: ${posts.length} -> ${result.length} posts`);
  
  return result;
};

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

export const groupPollOptions = async (
  posts: AmityPost[],
  postChildren: AmityPost[],
  userToken?: string
): Promise<AmityPost[]> => {
  const uniquePostChildren = deduplicatePosts(postChildren);
  const childrenMap = new Map<string, AmityPost[]>();
  
  uniquePostChildren.forEach((child) => {
    const parentId = child.parentPostId;
    if (parentId) {
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(child);
      
      console.log('[groupPollOptions] PostChild encontrado:', {
        childId: child.postId || child._id,
        parentId,
        dataType: child.dataType,
        data: child.data,
        dataText: child.data?.text,
        dataTitle: child.data?.title,
        sequenceNumber: child.sequenceNumber,
        reactionsCount: child.reactionsCount,
        fullChild: JSON.stringify(child, null, 2),
      });
    }
  });

  childrenMap.forEach((children) => {
    children.sort((a, b) => {
      const seqA = a.sequenceNumber ?? 0;
      const seqB = b.sequenceNumber ?? 0;
      return seqA - seqB;
    });
  });

  const uniquePosts = deduplicatePosts(posts);
  
  const postsWithPollOptions = await Promise.all(
    uniquePosts.map(async (post) => {
      if (post.structureType === 'poll' && post.postId) {
        const pollOptions = childrenMap.get(post.postId) || [];
        
        const sortedOptions = [...pollOptions].sort((a, b) => {
          const seqA = a.sequenceNumber ?? 0;
          const seqB = b.sequenceNumber ?? 0;
          return seqA - seqB;
        });

        const firstOptionPollId = sortedOptions[0]?.data?.pollId;
        
        if (firstOptionPollId) {
          try {
            const pollResponse = await socialPlusClient.getPoll(firstOptionPollId, userToken);
            console.log('[groupPollOptions] Poll response:', JSON.stringify(pollResponse));
            if (pollResponse.success && pollResponse.data) {
              const pollData = pollResponse.data as { polls?: AmityPoll[] };
              
              if (!pollData.polls || !Array.isArray(pollData.polls) || pollData.polls.length === 0) {
                console.warn('[groupPollOptions] Poll não encontrada na estrutura esperada');
                return {
                  ...post,
                  pollOptions: sortedOptions.length > 0 ? sortedOptions : undefined,
                };
              }
              
              const poll = pollData.polls[0];
              
              if (!poll.answers || !Array.isArray(poll.answers) || poll.answers.length === 0) {
                console.warn('[groupPollOptions] Poll sem answers');
                return {
                  ...post,
                  pollOptions: sortedOptions.length > 0 ? sortedOptions : undefined,
                };
              }
              
              const pollAnswers = poll.answers;
              
              console.log('[groupPollOptions] Dados da poll buscados:', {
                pollId: firstOptionPollId,
                question: poll.question,
                answersCount: pollAnswers.length,
                answers: pollAnswers.map(ans => ({ id: ans.id, data: ans.data, voteCount: ans.voteCount })),
              });

              const enrichedOptionsMap = new Map<string, AmityPost>();
              
              sortedOptions.forEach((opt) => {
                const optId = opt.postId || opt._id;
                if (!optId) {
                  return;
                }
                
                const pollAnswer = pollAnswers.find(ans => ans.id === optId);
                
                if (pollAnswer && pollAnswer.data) {
                  const answerIndex = pollAnswers.indexOf(pollAnswer);
                  enrichedOptionsMap.set(optId, {
                    ...opt,
                    data: {
                      ...opt.data,
                      text: pollAnswer.data,
                    },
                    reactionsCount: pollAnswer.voteCount ?? 0,
                    sequenceNumber: answerIndex,
                  });
                } else {
                  enrichedOptionsMap.set(optId, opt);
                }
              });
              
              pollAnswers.forEach((pollAnswer, index) => {
                if (!pollAnswer.id || !pollAnswer.data) {
                  return;
                }
                
                const existingOption = enrichedOptionsMap.get(pollAnswer.id);
                if (!existingOption) {
                  enrichedOptionsMap.set(pollAnswer.id, {
                    postId: pollAnswer.id,
                    _id: pollAnswer.id,
                    parentPostId: post.postId,
                    structureType: 'poll',
                    dataType: pollAnswer.dataType || 'text',
                    data: {
                      text: pollAnswer.data,
                      pollId: firstOptionPollId,
                    },
                    reactionsCount: pollAnswer.voteCount ?? 0,
                    sequenceNumber: index,
                  } as AmityPost);
                } else if (existingOption.sequenceNumber === undefined || existingOption.sequenceNumber === null) {
                  existingOption.sequenceNumber = index;
                }
              });
              
              const enrichedOptions = pollAnswers
                .map((pollAnswer, index) => {
                  if (!pollAnswer.id || !pollAnswer.data) {
                    return null;
                  }
                  
                  let option = enrichedOptionsMap.get(pollAnswer.id);
                  
                  if (!option) {
                    option = {
                      postId: pollAnswer.id,
                      _id: pollAnswer.id,
                      parentPostId: post.postId,
                      structureType: 'poll',
                      dataType: pollAnswer.dataType || 'text',
                      data: {
                        text: pollAnswer.data,
                        pollId: firstOptionPollId,
                      },
                      reactionsCount: pollAnswer.voteCount ?? 0,
                      sequenceNumber: index,
                    } as AmityPost;
                  } else {
                    option.sequenceNumber = index;
                    if (!option.data) {
                      option.data = {};
                    }
                    if (!option.data.text) {
                      option.data.text = pollAnswer.data;
                    }
                    if (option.reactionsCount === undefined || option.reactionsCount === null) {
                      option.reactionsCount = pollAnswer.voteCount ?? 0;
                    }
                  }
                  
                  return option;
                })
                .filter((opt): opt is AmityPost => opt !== null && opt !== undefined);
              
              const deduplicatedOptions = deduplicatePosts(enrichedOptions);
              
              console.log('[groupPollOptions] Poll options enriquecidas:', {
                postId: post.postId,
                totalOptions: deduplicatedOptions.length,
                enrichedOptions: deduplicatedOptions.map(opt => ({
                  id: opt.postId || opt._id,
                  text: opt.data?.text,
                  sequenceNumber: opt.sequenceNumber,
                  voteCount: opt.reactionsCount,
                })),
              });
              
              return {
                ...post,
                pollOptions: deduplicatedOptions.length > 0 ? deduplicatedOptions : undefined,
              };
            }
          } catch (error) {
            console.error(`[groupPollOptions] Erro ao buscar poll ${firstOptionPollId}:`, error);
          }
        }
        
        return {
          ...post,
          pollOptions: sortedOptions.length > 0 ? sortedOptions : undefined,
        };
      }
      
      return post;
    })
  );

  return postsWithPollOptions;
};

export const buildAmityFeedResponse = async (
  feedData: AmityUserFeedData,
  status: string,
  page: number,
  limit: number,
  userToken?: string
): Promise<AmityUserFeedResponse & { pagination?: { page: number; limit: number; total: number; totalPages: number } }> => {
  const posts = feedData.posts ?? [];
  const postChildren = feedData.postChildren ?? [];
  const paging = feedData.paging ?? {};

  const postsWithPollOptions = await groupPollOptions(posts, postChildren, userToken);
  const deduplicatedPosts = deduplicatePosts(postsWithPollOptions);

  return {
    status,
    data: {
      posts: deduplicatedPosts,
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






