import { Request, Response } from 'express';
import prisma from '@/config/database';
import { sendSuccess, sendError } from '@/utils/response';

/**
 * @swagger
 * /api/person-contacts:
 *   post:
 *     summary: Criar um novo contato de pessoa
 *     tags: [PersonContacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - personId
 *               - type
 *               - value
 *             properties:
 *               personId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [email, phone, whatsapp, other]
 *               value:
 *                 type: string
 *     responses:
 *       201:
 *         description: Contato criado com sucesso
 *       400:
 *         description: Dados inválidos
 */
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

/**
 * @swagger
 * /api/person-contacts/{id}:
 *   get:
 *     summary: Obter contato por ID
 *     tags: [PersonContacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do contato
 *     responses:
 *       200:
 *         description: Contato obtido com sucesso
 *       404:
 *         description: Contato não encontrado
 */
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

/**
 * @swagger
 * /api/person-contacts:
 *   get:
 *     summary: Listar todos os contatos
 *     tags: [PersonContacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: personId
 *         schema:
 *           type: string
 *         description: Filtrar por ID da pessoa
 *     responses:
 *       200:
 *         description: Lista de contatos obtida com sucesso
 */
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

/**
 * @swagger
 * /api/person-contacts/{id}:
 *   put:
 *     summary: Atualizar contato
 *     tags: [PersonContacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [email, phone, whatsapp, other]
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contato atualizado com sucesso
 *       404:
 *         description: Contato não encontrado
 */
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

/**
 * @swagger
 * /api/person-contacts/{id}:
 *   delete:
 *     summary: Deletar contato (soft delete)
 *     tags: [PersonContacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contato deletado com sucesso
 *       404:
 *         description: Contato não encontrado
 */
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

