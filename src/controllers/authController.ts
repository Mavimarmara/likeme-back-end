import { Request, Response } from 'express';
import prisma from '@/config/database';
import { hashPassword, comparePassword, generateToken } from '@/utils/auth';
import { sendSuccess, sendError } from '@/utils/response';
import { CreateUserData, LoginData, AuthResponse } from '@/types';

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar novo usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               surname:
 *                 type: string
 *               phone:
 *                 type: string
 *               birthdate:
 *                 type: string
 *                 format: date
 *               avatar:
 *                 type: string
 *                 format: uri
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *       409:
 *         description: Usuário ou email já existe
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const userData: CreateUserData = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { username: userData.username },
    });

    if (existingUser) {
      sendError(res, 'Usuário já existe com este username', 409);
      return;
    }

    const existingContact = await prisma.personContact.findFirst({
      where: {
        type: 'email',
        value: userData.email,
      },
    });

    if (existingContact) {
      sendError(res, 'Email já cadastrado', 409);
      return;
    }

    const hashedPassword = await hashPassword(userData.password);

    const person = await prisma.person.create({
      data: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        surname: userData.surname,
        birthdate: userData.birthdate ? new Date(userData.birthdate) : null,
      },
    });

    await prisma.personContact.create({
      data: {
        personId: person.id,
        type: 'email',
        value: userData.email,
      },
    });

    if (userData.phone) {
      await prisma.personContact.create({
        data: {
          personId: person.id,
          type: 'phone',
          value: userData.phone,
        },
      });
    }

    const user = await prisma.user.create({
      data: {
        personId: person.id,
        username: userData.username,
        password: hashedPassword,
        avatar: userData.avatar,
      },
      include: {
        person: {
          include: {
            contacts: true,
          },
        },
      },
    });

    const token = generateToken(user.id);
    const { password: _, ...userWithoutPassword } = user;

    const response: AuthResponse = {
      user: userWithoutPassword,
      token,
    };

    sendSuccess(res, response, 'Usuário criado com sucesso', 201);
  } catch (error) {
    console.error('Register error:', error);
    sendError(res, 'Erro ao criar usuário');
  }
};

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login de usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *       401:
 *         description: Credenciais inválidas
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password }: LoginData = req.body;

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        person: {
          include: {
            contacts: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      sendError(res, 'Credenciais inválidas', 401);
      return;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      sendError(res, 'Credenciais inválidas', 401);
      return;
    }

    const token = generateToken(user.id);
    const { password: _, ...userWithoutPassword } = user;

    const response: AuthResponse = {
      user: userWithoutPassword,
      token,
    };

    sendSuccess(res, response, 'Login realizado com sucesso');
  } catch (error) {
    console.error('Login error:', error);
    sendError(res, 'Erro ao fazer login');
  }
};

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Obter perfil do usuário autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtido com sucesso
 *       401:
 *         description: Não autenticado
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        person: {
          include: {
            contacts: true,
          },
        },
      },
    });

    if (!user) {
      sendError(res, 'Usuário não encontrado', 404);
      return;
    }

    sendSuccess(res, user, 'Perfil obtido com sucesso');
  } catch (error) {
    console.error('Get profile error:', error);
    sendError(res, 'Erro ao obter perfil');
  }
};

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Atualizar perfil do usuário autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               surname:
 *                 type: string
 *               birthdate:
 *                 type: string
 *                 format: date
 *               avatar:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Perfil atualizado com sucesso
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Usuário não encontrado
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const updateData = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      sendError(res, 'Usuário não encontrado', 404);
      return;
    }

    const userUpdateData: any = {};
    if (updateData.username) userUpdateData.username = updateData.username;
    if (updateData.avatar) userUpdateData.avatar = updateData.avatar;

    const personUpdateData: any = {};
    if (updateData.firstName) personUpdateData.firstName = updateData.firstName;
    if (updateData.lastName) personUpdateData.lastName = updateData.lastName;
    if (updateData.surname) personUpdateData.surname = updateData.surname;
    if (updateData.birthdate) personUpdateData.birthdate = new Date(updateData.birthdate);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...userUpdateData,
        person: personUpdateData && Object.keys(personUpdateData).length > 0
          ? { update: personUpdateData }
          : undefined,
      },
      include: {
        person: {
          include: {
            contacts: true,
          },
        },
      },
    });

    sendSuccess(res, updatedUser, 'Perfil atualizado com sucesso');
  } catch (error) {
    console.error('Update profile error:', error);
    sendError(res, 'Erro ao atualizar perfil');
  }
};

/**
 * @swagger
 * /api/auth/account:
 *   delete:
 *     summary: Deletar conta do usuário autenticado (soft delete)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conta desativada com sucesso
 *       401:
 *         description: Não autenticado
 */
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    sendSuccess(res, null, 'Conta desativada com sucesso');
  } catch (error) {
    console.error('Delete account error:', error);
    sendError(res, 'Erro ao desativar conta');
  }
};
