import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '@/config/database';
import { AuthenticatedRequest } from '@/types';
import { config } from '@/config';
import { verifyAuth0Token, extractUserInfoFromToken } from '@/utils/auth0';

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

    // Tenta verificar como token do backend primeiro
    try {
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
    } catch (backendTokenError) {
      // Se não for token do backend, tenta verificar como idToken do Auth0
      try {
        const auth0Decoded = await verifyAuth0Token(token);
        const auth0User = extractUserInfoFromToken(auth0Decoded);
        const email = auth0User.email;

        if (!email) {
          return res.status(401).json({
            success: false,
            message: 'Email não encontrado no token do Auth0',
          });
        }

        // Busca o usuário pelo email
        const contact = await prisma.personContact.findFirst({
          where: {
            type: 'email',
            value: email,
            deletedAt: null,
          },
          include: {
            person: {
              include: {
                user: {
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
                },
              },
            },
          },
        });

        if (!contact?.person?.user) {
          return res.status(401).json({
            success: false,
            message: 'Usuário não encontrado. Faça o registro primeiro.',
          });
        }

        const user = contact.person.user;

        if (user.deletedAt) {
          return res.status(401).json({
            success: false,
            message: 'Usuário deletado',
          });
        }

        if (!user.isActive) {
          return res.status(401).json({
            success: false,
            message: 'Usuário inativo',
          });
        }

        req.user = user;
        return next();
      } catch (auth0TokenError) {
        // Se ambos falharem, retorna erro
      return res.status(401).json({
        success: false,
        message: 'Token inválido',
      });
    }
    }
  } catch (error) {
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
