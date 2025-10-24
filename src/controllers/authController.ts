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
      where: { email: userData.email },
    });

    if (existingUser) {
      sendError(res, 'Usuário já existe com este email', 409);
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        birthDate: true,
        gender: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Generate token
    const token = generateToken(user.id);

    const response: AuthResponse = {
      user,
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
    const { email, password }: LoginData = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
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
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        birthDate: true,
        gender: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
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

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        birthDate: true,
        gender: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    sendSuccess(res, user, 'Perfil atualizado com sucesso');
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
