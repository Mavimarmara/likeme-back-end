import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '@/config/database';
import { sendError, sendSuccess } from '@/utils/response';

export const getTips = async (_req: Request, res: Response): Promise<void> => {
  try {
    const tips = await prisma.tip.findMany({
      orderBy: {
        order: 'asc',
      },
    });

    sendSuccess(res, tips, 'Dicas carregadas com sucesso');
  } catch (error) {
    console.error('Erro ao buscar dicas:', error);
    sendError(res, 'Não foi possível carregar as dicas', 500);
  }
};

export const createOrUpdateTip = async (req: Request, res: Response): Promise<void> => {
  const {
    id,
    title,
    description,
    image,
    order,
  } = req.body;

  try {
    if (id) {
      const updatedTip = await prisma.tip.update({
        where: { id },
        data: {
          title,
          description,
          image,
          ...(order !== undefined ? { order } : {}),
        },
      });

      sendSuccess(res, updatedTip, 'Dica atualizada com sucesso');
      return;
    }

    let tipOrder = order ?? null;

    if (tipOrder === null) {
      const { _max } = await prisma.tip.aggregate({
        _max: { order: true },
      });

      tipOrder = (_max.order ?? 0) + 1;
    }

    const newTip = await prisma.tip.create({
      data: {
        title,
        description,
        image,
        order: tipOrder,
      },
    });

    sendSuccess(res, newTip, 'Dica criada com sucesso', 201);
  } catch (error) {
    console.error('Erro ao criar ou atualizar dica:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      sendError(res, 'Dica não encontrada', 404);
      return;
    }

    sendError(res, 'Não foi possível salvar a dica', 500);
  }
};

export const deleteTip = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const deletedTip = await prisma.tip.delete({
      where: { id },
    });

    sendSuccess(res, deletedTip, 'Dica removida com sucesso');
  } catch (error) {
    console.error('Erro ao remover dica:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      sendError(res, 'Dica não encontrada', 404);
      return;
    }

    sendError(res, 'Não foi possível remover a dica', 500);
  }
};


