import { Request, Response } from 'express';
import prisma from '@/config/database';
import { sendSuccess, sendError } from '@/utils/response';

export const createPersonContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const contactData = req.body;

    const contact = await prisma.personContact.create({
      data: contactData,
      include: {
        person: true,
      },
    });

    sendSuccess(res, contact, 'Contato criado com sucesso', 201);
  } catch (error) {
    console.error('Create person contact error:', error);
    sendError(res, 'Erro ao criar contato');
  }
};

export const getPersonContactById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const contact = await prisma.personContact.findUnique({
      where: { id },
      include: {
        person: true,
      },
    });

    if (!contact) {
      sendError(res, 'Contato não encontrado', 404);
      return;
    }

    sendSuccess(res, contact, 'Contato obtido com sucesso');
  } catch (error) {
    console.error('Get person contact error:', error);
    sendError(res, 'Erro ao obter contato');
  }
};

export const getAllPersonContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const personId = req.query.personId as string;

    const where: any = {
      deletedAt: null,
    };

    if (personId) {
      where.personId = personId;
    }

    const [contacts, total] = await Promise.all([
      prisma.personContact.findMany({
        where,
        skip,
        take: limit,
        include: {
          person: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.personContact.count({ where }),
    ]);

    sendSuccess(res, {
      contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Contatos obtidos com sucesso');
  } catch (error) {
    console.error('Get all person contacts error:', error);
    sendError(res, 'Erro ao obter contatos');
  }
};

export const updatePersonContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const contact = await prisma.personContact.update({
      where: { id },
      data: updateData,
      include: {
        person: true,
      },
    });

    sendSuccess(res, contact, 'Contato atualizado com sucesso');
  } catch (error) {
    console.error('Update person contact error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'Contato não encontrado', 404);
      return;
    }
    sendError(res, 'Erro ao atualizar contato');
  }
};

export const deletePersonContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.personContact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    sendSuccess(res, null, 'Contato deletado com sucesso');
  } catch (error) {
    console.error('Delete person contact error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'Contato não encontrado', 404);
      return;
    }
    sendError(res, 'Erro ao deletar contato');
  }
};

