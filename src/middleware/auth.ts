import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '@/config/database';
import { AuthenticatedRequest } from '@/types';
import { config } from '@/config';

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso necessário',
      });
    }

    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        personId: true,
        username: true,
        password: true,
        salt: true,
        avatar: true,
        isActive: true,
        socialPlusUserId: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    if (user && user.deletedAt) {
      return res.status(401).json({
        success: false,
        message: 'Usuário deletado',
      });
    }

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado ou inativo',
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
    });
  }
};

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Autenticação necessária',
    });
  }
  return next();
};
