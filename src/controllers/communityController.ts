import { Request, Response } from 'express';
import prisma from '@/config/database';
import { sendSuccess, sendError, sendPaginated } from '@/utils/response';
import { CreatePostData, UpdatePostData, SearchQuery } from '@/types';

export const createPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const postData: CreatePostData = req.body;

    const post = await prisma.post.create({
      data: {
        userId,
        ...postData,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    sendSuccess(res, post, 'Post criado com sucesso', 201);
  } catch (error) {
    console.error('Create post error:', error);
    sendError(res, 'Erro ao criar post');
  }
};

export const getPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, category, search, sortBy = 'createdAt', sortOrder = 'desc' }: SearchQuery = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
        },
      }),
      prisma.post.count({ where }),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    sendPaginated(res, posts, {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
    }, 'Posts obtidos com sucesso');
  } catch (error) {
    console.error('Get posts error:', error);
    sendError(res, 'Erro ao obter posts');
  }
};

export const getPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    if (!post) {
      sendError(res, 'Post não encontrado', 404);
      return;
    }

    sendSuccess(res, post, 'Post obtido com sucesso');
  } catch (error) {
    console.error('Get post error:', error);
    sendError(res, 'Erro ao obter post');
  }
};

export const updatePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const updateData: UpdatePostData = req.body;

    const post = await prisma.post.findFirst({
      where: { id, userId },
    });

    if (!post) {
      sendError(res, 'Post não encontrado ou você não tem permissão para editá-lo', 404);
      return;
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    sendSuccess(res, updatedPost, 'Post atualizado com sucesso');
  } catch (error) {
    console.error('Update post error:', error);
    sendError(res, 'Erro ao atualizar post');
  }
};

export const deletePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const post = await prisma.post.findFirst({
      where: { id, userId },
    });

    if (!post) {
      sendError(res, 'Post não encontrado ou você não tem permissão para deletá-lo', 404);
      return;
    }

    await prisma.post.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Post deletado com sucesso');
  } catch (error) {
    console.error('Delete post error:', error);
    sendError(res, 'Erro ao deletar post');
  }
};

export const likePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      sendError(res, 'Post não encontrado', 404);
      return;
    }

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userId: {
          postId: id,
          userId,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: {
          postId_userId: {
            postId: id,
            userId,
          },
        },
      });

      // Update post likes count
      await prisma.post.update({
        where: { id },
        data: { likesCount: { decrement: 1 } },
      });

      sendSuccess(res, { liked: false }, 'Post descurtido com sucesso');
    } else {
      // Like
      await prisma.like.create({
        data: {
          postId: id,
          userId,
        },
      });

      // Update post likes count
      await prisma.post.update({
        where: { id },
        data: { likesCount: { increment: 1 } },
      });

      sendSuccess(res, { liked: true }, 'Post curtido com sucesso');
    }
  } catch (error) {
    console.error('Like post error:', error);
    sendError(res, 'Erro ao curtir post');
  }
};

export const createComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { content } = req.body;

    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      sendError(res, 'Post não encontrado', 404);
      return;
    }

    const comment = await prisma.comment.create({
      data: {
        postId: id,
        userId,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    sendSuccess(res, comment, 'Comentário criado com sucesso', 201);
  } catch (error) {
    console.error('Create comment error:', error);
    sendError(res, 'Erro ao criar comentário');
  }
};

export const deleteComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { commentId } = req.params;

    const comment = await prisma.comment.findFirst({
      where: { id: commentId, userId },
    });

    if (!comment) {
      sendError(res, 'Comentário não encontrado ou você não tem permissão para deletá-lo', 404);
      return;
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    sendSuccess(res, null, 'Comentário deletado com sucesso');
  } catch (error) {
    console.error('Delete comment error:', error);
    sendError(res, 'Erro ao deletar comentário');
  }
};
