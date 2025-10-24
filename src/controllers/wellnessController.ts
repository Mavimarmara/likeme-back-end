import { Request, Response } from 'express';
import prisma from '@/config/database';
import { sendSuccess, sendError, sendPaginated } from '@/utils/response';
import { CreateWellnessData, SearchQuery } from '@/types';

export const createWellnessData = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const wellnessData: CreateWellnessData = req.body;

    const data = await prisma.wellnessData.create({
      data: {
        userId,
        ...wellnessData,
        date: wellnessData.date ? new Date(wellnessData.date) : new Date(),
      },
    });

    sendSuccess(res, data, 'Dados de bem-estar criados com sucesso', 201);
  } catch (error) {
    console.error('Create wellness data error:', error);
    sendError(res, 'Erro ao criar dados de bem-estar');
  }
};

export const getWellnessData = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { page = 1, limit = 10, category, startDate, endDate }: any = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { userId };

    if (category) {
      where.category = category;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      prisma.wellnessData.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { date: 'desc' },
      }),
      prisma.wellnessData.count({ where }),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    sendPaginated(res, data, {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
    }, 'Dados de bem-estar obtidos com sucesso');
  } catch (error) {
    console.error('Get wellness data error:', error);
    sendError(res, 'Erro ao obter dados de bem-estar');
  }
};

export const getWellnessSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { days = 30 }: any = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    // Get latest wellness data for each category
    const categories = ['physical', 'mental', 'emotional', 'social'];
    const summary = await Promise.all(
      categories.map(async (category) => {
        const latestData = await prisma.wellnessData.findFirst({
          where: {
            userId,
            category,
            date: { gte: startDate },
          },
          orderBy: { date: 'desc' },
        });

        return {
          category,
          score: latestData?.score || 0,
          date: latestData?.date || null,
        };
      })
    );

    // Calculate overall score
    const scores = summary.filter(s => s.score > 0).map(s => s.score);
    const overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const result = {
      overallScore,
      categories: summary,
      period: `${days} dias`,
    };

    sendSuccess(res, result, 'Resumo de bem-estar obtido com sucesso');
  } catch (error) {
    console.error('Get wellness summary error:', error);
    sendError(res, 'Erro ao obter resumo de bem-estar');
  }
};

export const updateWellnessData = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const updateData: Partial<CreateWellnessData> = req.body;

    const wellnessData = await prisma.wellnessData.findFirst({
      where: { id, userId },
    });

    if (!wellnessData) {
      sendError(res, 'Dados de bem-estar não encontrados', 404);
      return;
    }

    const updatedData = await prisma.wellnessData.update({
      where: { id },
      data: {
        ...updateData,
        date: updateData.date ? new Date(updateData.date) : undefined,
      },
    });

    sendSuccess(res, updatedData, 'Dados de bem-estar atualizados com sucesso');
  } catch (error) {
    console.error('Update wellness data error:', error);
    sendError(res, 'Erro ao atualizar dados de bem-estar');
  }
};

export const deleteWellnessData = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const wellnessData = await prisma.wellnessData.findFirst({
      where: { id, userId },
    });

    if (!wellnessData) {
      sendError(res, 'Dados de bem-estar não encontrados', 404);
      return;
    }

    await prisma.wellnessData.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Dados de bem-estar deletados com sucesso');
  } catch (error) {
    console.error('Delete wellness data error:', error);
    sendError(res, 'Erro ao deletar dados de bem-estar');
  }
};
