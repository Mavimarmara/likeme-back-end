import { Request, Response } from 'express';
import prisma from '@/config/database';
import { hashPassword, generateToken } from '@/utils/auth';
import { verifyAuth0Token, extractUserInfoFromToken } from '@/utils/auth0';
import { sendSuccess, sendError } from '@/utils/response';
import { CreateUserData, AuthResponse } from '@/types';

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

    if (userData.username) {
      const existingUser = await prisma.user.findUnique({
        where: { username: userData.username },
      });

      if (existingUser) {
        sendError(res, 'Usuário já existe com este username', 409);
        return;
      }
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

    const userDataToCreate: any = {
      personId: person.id,
      password: hashedPassword,
      avatar: userData.avatar,
    };

    if (userData.username) {
      userDataToCreate.username = userData.username;
    }

    const user = await prisma.user.create({
      data: userDataToCreate,
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
 *     summary: Login com Auth0
 *     description: Valida o idToken do Auth0 e retorna token de sessão do backend. Aceita idToken no body ou no header Authorization.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Token JWT do Auth0 (idToken)
 *               user:
 *                 type: object
 *                 description: Informações do usuário do Auth0 (opcional)
 *                 properties:
 *                   email:
 *                     type: string
 *                   name:
 *                     type: string
 *                   picture:
 *                     type: string
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *       400:
 *         description: Token inválido ou ausente
 *       401:
 *         description: Token do Auth0 inválido
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const idToken = req.body.idToken || (req.headers.authorization?.replace('Bearer ', ''));
    
    if (!idToken) {
      sendError(res, 'Token do Auth0 não fornecido', 400);
      return;
    }

    let decoded;
    try {
      decoded = await verifyAuth0Token(idToken);
    } catch (error) {
      console.error('Auth0 token validation error:', error);
      sendError(res, 'Token do Auth0 inválido ou expirado', 401);
      return;
    }

    const auth0User = extractUserInfoFromToken(decoded);
    const userInfo = req.body.user || {};

    const email = auth0User.email || userInfo.email;
    if (!email) {
      sendError(res, 'Email não encontrado no token do Auth0', 400);
      return;
    }

    const existingContact = await prisma.personContact.findFirst({
      where: {
        type: 'email',
        value: email,
        deletedAt: null,
      },
      include: {
        person: {
          include: {
            user: {
              include: {
                person: {
                  include: {
                    contacts: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    let user;
    let person;

    if (existingContact?.person?.user) {
      user = existingContact.person.user;
      person = existingContact.person;

      if (userInfo.picture && userInfo.picture !== user.avatar) {
        await prisma.user.update({
          where: { id: user.id },
          data: { avatar: userInfo.picture },
        });
        user.avatar = userInfo.picture;
      }
    } else {
      const name = auth0User.name || userInfo.name || email.split('@')[0];
      const nameParts = name.split(' ');
      const firstName = auth0User.given_name || nameParts[0] || '';
      const lastName = auth0User.family_name || nameParts.slice(1).join(' ') || '';

      person = await prisma.person.create({
        data: {
          firstName,
          lastName,
          surname: auth0User.nickname || undefined,
        },
      });

      await prisma.personContact.create({
        data: {
          personId: person.id,
          type: 'email',
          value: email,
        },
      });

      const randomPassword = await hashPassword(`auth0_${auth0User.sub}_${Date.now()}`);
      
      user = await prisma.user.create({
        data: {
          personId: person.id,
          password: randomPassword,
          avatar: auth0User.picture || userInfo.picture || undefined,
          isActive: true,
        },
        include: {
          person: {
            include: {
              contacts: true,
            },
          },
        },
      });
    }

    if (!user.isActive || user.deletedAt) {
      sendError(res, 'Usuário inativo ou deletado', 401);
      return;
    }

    const sessionToken = generateToken(user.id);
    const { password: _, ...userWithoutPassword } = user;

    const response: AuthResponse = {
      user: userWithoutPassword,
      token: sessionToken,
    };

    sendSuccess(res, response, 'Login realizado com sucesso');
  } catch (error) {
    console.error('Auth0 login error:', error);
    sendError(res, 'Erro ao fazer login com Auth0');
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

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout do usuário
 *     description: Invalida a sessão do usuário (opcional, token será invalidado no frontend)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 *       401:
 *         description: Não autenticado
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    sendSuccess(res, null, 'Logout realizado com sucesso');
  } catch (error) {
    console.error('Logout error:', error);
    sendError(res, 'Erro ao fazer logout');
  }
};
