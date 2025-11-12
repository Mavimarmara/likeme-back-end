import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '@/config/database';
import { sendError, sendSuccess } from '@/utils/response';

/**
 * @swagger
 * /api/tips:
 *   get:
 *     summary: Listar dicas de onboarding
 *     tags: [Tips]
 *     responses:
 *       200:
 *         description: Lista de dicas retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       image:
 *                         type: string
 *                         format: uri
 *       500:
 *         description: Erro ao buscar as dicas
 */
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

/**
 * @swagger
 * /api/tips:
 *   post:
 *     summary: Criar ou atualizar uma dica
 *     tags: [Tips]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *                 description: Informe para atualizar uma dica existente
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *               order:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Dica criada ou atualizada com sucesso
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Dica não encontrada (ao atualizar)
 */
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

/**
 * @swagger
 * /api/tips/{id}:
 *   delete:
 *     summary: Remover uma dica
 *     tags: [Tips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *     responses:
 *       200:
 *         description: Dica removida com sucesso
 *       404:
 *         description: Dica não encontrada
 */
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


