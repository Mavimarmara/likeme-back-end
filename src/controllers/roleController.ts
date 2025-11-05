import { Request, Response } from 'express';
import prisma from '@/config/database';
import { sendSuccess, sendError } from '@/utils/response';

/**
 * @swagger
 * /api/roles:
 *   post:
 *     summary: Criar uma nova role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Role criada com sucesso
 *       400:
 *         description: Dados inválidos
 */
export const createRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const roleData = req.body;

    const role = await prisma.role.create({
      data: roleData,
      include: {
        roleGroups: true,
      },
    });

    sendSuccess(res, role, 'Role criada com sucesso', 201);
  } catch (error) {
    console.error('Create role error:', error);
    sendError(res, 'Erro ao criar role');
  }
};

/**
 * @swagger
 * /api/roles/{id}:
 *   get:
 *     summary: Obter role por ID
 *     tags: [Roles]
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
 *         description: Role obtida com sucesso
 *       404:
 *         description: Role não encontrada
 */
export const getRoleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        roleGroups: true,
      },
    });

    if (!role) {
      sendError(res, 'Role não encontrada', 404);
      return;
    }

    sendSuccess(res, role, 'Role obtida com sucesso');
  } catch (error) {
    console.error('Get role error:', error);
    sendError(res, 'Erro ao obter role');
  }
};

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Listar todas as roles
 *     tags: [Roles]
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
 *     responses:
 *       200:
 *         description: Lista de roles obtida com sucesso
 */
export const getAllRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        skip,
        take: limit,
        include: {
          roleGroups: true,
        },
        orderBy: { createdAt: 'desc' },
        where: {
          deletedAt: null,
        },
      }),
      prisma.role.count({
        where: {
          deletedAt: null,
        },
      }),
    ]);

    sendSuccess(res, {
      roles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Roles obtidas com sucesso');
  } catch (error) {
    console.error('Get all roles error:', error);
    sendError(res, 'Erro ao obter roles');
  }
};

/**
 * @swagger
 * /api/roles/{id}:
 *   put:
 *     summary: Atualizar role
 *     tags: [Roles]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Role atualizada com sucesso
 *       404:
 *         description: Role não encontrada
 */
export const updateRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const role = await prisma.role.update({
      where: { id },
      data: updateData,
      include: {
        roleGroups: true,
      },
    });

    sendSuccess(res, role, 'Role atualizada com sucesso');
  } catch (error) {
    console.error('Update role error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'Role não encontrada', 404);
      return;
    }
    sendError(res, 'Erro ao atualizar role');
  }
};

/**
 * @swagger
 * /api/roles/{id}:
 *   delete:
 *     summary: Deletar role (soft delete)
 *     tags: [Roles]
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
 *         description: Role deletada com sucesso
 *       404:
 *         description: Role não encontrada
 */
export const deleteRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.role.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    sendSuccess(res, null, 'Role deletada com sucesso');
  } catch (error) {
    console.error('Delete role error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'Role não encontrada', 404);
      return;
    }
    sendError(res, 'Erro ao deletar role');
  }
};

