import { Request, Response } from 'express';
import prisma from '@/config/database';
import { sendSuccess, sendError } from '@/utils/response';

/**
 * @swagger
 * /api/persons:
 *   post:
 *     summary: Criar uma nova pessoa
 *     tags: [Persons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               surname:
 *                 type: string
 *               nationalRegistration:
 *                 type: string
 *               birthdate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Pessoa criada com sucesso
 *       400:
 *         description: Dados inválidos
 */
export const createPerson = async (req: Request, res: Response): Promise<void> => {
  try {
    const personData = req.body;

    const person = await prisma.person.create({
      data: personData,
      include: {
        contacts: true,
        user: true,
      },
    });

    sendSuccess(res, person, 'Pessoa criada com sucesso', 201);
  } catch (error) {
    console.error('Create person error:', error);
    sendError(res, 'Erro ao criar pessoa');
  }
};

/**
 * @swagger
 * /api/persons/{id}:
 *   get:
 *     summary: Obter pessoa por ID
 *     tags: [Persons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da pessoa
 *     responses:
 *       200:
 *         description: Pessoa obtida com sucesso
 *       404:
 *         description: Pessoa não encontrada
 */
export const getPersonById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const person = await prisma.person.findUnique({
      where: { id },
      include: {
        contacts: true,
        user: true,
      },
    });

    if (!person) {
      sendError(res, 'Pessoa não encontrada', 404);
      return;
    }

    sendSuccess(res, person, 'Pessoa obtida com sucesso');
  } catch (error) {
    console.error('Get person error:', error);
    sendError(res, 'Erro ao obter pessoa');
  }
};

/**
 * @swagger
 * /api/persons:
 *   get:
 *     summary: Listar todas as pessoas
 *     tags: [Persons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Limite de itens por página
 *     responses:
 *       200:
 *         description: Lista de pessoas obtida com sucesso
 */
export const getAllPersons = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [persons, total] = await Promise.all([
      prisma.person.findMany({
        skip,
        take: limit,
        include: {
          contacts: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
        where: {
          deletedAt: null,
        },
      }),
      prisma.person.count({
        where: {
          deletedAt: null,
        },
      }),
    ]);

    sendSuccess(res, {
      persons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Pessoas obtidas com sucesso');
  } catch (error) {
    console.error('Get all persons error:', error);
    sendError(res, 'Erro ao obter pessoas');
  }
};

/**
 * @swagger
 * /api/persons/{id}:
 *   put:
 *     summary: Atualizar pessoa
 *     tags: [Persons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da pessoa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               surname:
 *                 type: string
 *               nationalRegistration:
 *                 type: string
 *               birthdate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Pessoa atualizada com sucesso
 *       404:
 *         description: Pessoa não encontrada
 */
export const updatePerson = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const person = await prisma.person.update({
      where: { id },
      data: updateData,
      include: {
        contacts: true,
        user: true,
      },
    });

    sendSuccess(res, person, 'Pessoa atualizada com sucesso');
  } catch (error) {
    console.error('Update person error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'Pessoa não encontrada', 404);
      return;
    }
    sendError(res, 'Erro ao atualizar pessoa');
  }
};

/**
 * @swagger
 * /api/persons/{id}:
 *   delete:
 *     summary: Deletar pessoa (soft delete)
 *     tags: [Persons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da pessoa
 *     responses:
 *       200:
 *         description: Pessoa deletada com sucesso
 *       404:
 *         description: Pessoa não encontrada
 */
export const deletePerson = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.person.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    sendSuccess(res, null, 'Pessoa deletada com sucesso');
  } catch (error) {
    console.error('Delete person error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'Pessoa não encontrada', 404);
      return;
    }
    sendError(res, 'Erro ao deletar pessoa');
  }
};

