import { Request, Response } from 'express';
import prisma from '@/config/database';
import { sendSuccess, sendError } from '@/utils/response';
import { CreateAnamneseData } from '@/types';

export const createAnamnese = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const anamneseData: CreateAnamneseData = req.body;

    // Check if user already has anamnese
    const existingAnamnese = await prisma.anamnese.findFirst({
      where: { userId },
    });

    if (existingAnamnese) {
      sendError(res, 'Usuário já possui anamnese cadastrada', 409);
      return;
    }

    const anamnese = await prisma.anamnese.create({
      data: {
        userId,
        answers: anamneseData.answers as any,
        completed: true,
      },
    });

    sendSuccess(res, anamnese, 'Anamnese criada com sucesso', 201);
  } catch (error) {
    console.error('Create anamnese error:', error);
    sendError(res, 'Erro ao criar anamnese');
  }
};

export const getAnamnese = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    const anamnese = await prisma.anamnese.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!anamnese) {
      sendError(res, 'Anamnese não encontrada', 404);
      return;
    }

    sendSuccess(res, anamnese, 'Anamnese obtida com sucesso');
  } catch (error) {
    console.error('Get anamnese error:', error);
    sendError(res, 'Erro ao obter anamnese');
  }
};

export const updateAnamnese = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const anamneseData: CreateAnamneseData = req.body;

    const anamnese = await prisma.anamnese.findFirst({
      where: { userId },
    });

    if (!anamnese) {
      sendError(res, 'Anamnese não encontrada', 404);
      return;
    }

    const updatedAnamnese = await prisma.anamnese.update({
      where: { id: anamnese.id },
      data: {
        answers: anamneseData.answers as any,
        completed: true,
      },
    });

    sendSuccess(res, updatedAnamnese, 'Anamnese atualizada com sucesso');
  } catch (error) {
    console.error('Update anamnese error:', error);
    sendError(res, 'Erro ao atualizar anamnese');
  }
};

export const deleteAnamnese = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    const anamnese = await prisma.anamnese.findFirst({
      where: { userId },
    });

    if (!anamnese) {
      sendError(res, 'Anamnese não encontrada', 404);
      return;
    }

    await prisma.anamnese.delete({
      where: { id: anamnese.id },
    });

    sendSuccess(res, null, 'Anamnese deletada com sucesso');
  } catch (error) {
    console.error('Delete anamnese error:', error);
    sendError(res, 'Erro ao deletar anamnese');
  }
};
