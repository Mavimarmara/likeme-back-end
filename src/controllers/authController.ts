import { Request, Response } from 'express';
import prisma from '@/config/database';
import { hashPassword, comparePassword, generateToken } from '@/utils/auth';
import { sendSuccess, sendError } from '@/utils/response';
import { CreateUserData, LoginData, AuthResponse } from '@/types';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const userData: CreateUserData = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: userData.username },
    });

    if (existingUser) {
      sendError(res, 'Usuário já existe com este username', 409);
      return;
    }

    // Check if person already exists by email
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

    // Hash password
    const hashedPassword = await hashPassword(userData.password);

    // Create person first
    const person = await prisma.person.create({
      data: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        surname: userData.surname,
        birthdate: userData.birthdate ? new Date(userData.birthdate) : null,
      },
    });

    // Create email contact
    await prisma.personContact.create({
      data: {
        personId: person.id,
        type: 'email',
        value: userData.email,
      },
    });

    // Create phone contact if provided
    if (userData.phone) {
      await prisma.personContact.create({
        data: {
          personId: person.id,
          type: 'phone',
          value: userData.phone,
        },
      });
    }

    // Create user
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

    // Generate token
    const token = generateToken(user.id);

    // Remove password from response
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

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password }: LoginData = req.body;

    // Find user by username
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

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      sendError(res, 'Credenciais inválidas', 401);
      return;
    }

    // Generate token
    const token = generateToken(user.id);

    // Remove password from response
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

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const updateData = req.body;

    // Get user to access personId
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      sendError(res, 'Usuário não encontrado', 404);
      return;
    }

    // Update user fields
    const userUpdateData: any = {};
    if (updateData.username) userUpdateData.username = updateData.username;
    if (updateData.avatar) userUpdateData.avatar = updateData.avatar;

    // Update person fields
    const personUpdateData: any = {};
    if (updateData.firstName) personUpdateData.firstName = updateData.firstName;
    if (updateData.lastName) personUpdateData.lastName = updateData.lastName;
    if (updateData.surname) personUpdateData.surname = updateData.surname;
    if (updateData.birthdate) personUpdateData.birthdate = new Date(updateData.birthdate);

    // Update user
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

export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    // Soft delete - deactivate account
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
