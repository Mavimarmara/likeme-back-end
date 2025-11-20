import { createUserAccessToken } from '@/utils/amityClient';
import prisma from '@/config/database';

export interface GetTokenResult {
  token: string | null;
  error?: string;
}

export class UserTokenService {
  async getToken(userId: string, required = false): Promise<GetTokenResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { socialPlusUserId: true },
      });

      const socialPlusUserId = user?.socialPlusUserId;

      if (!socialPlusUserId) {
        if (required) {
          return { token: null, error: 'Usuário não está sincronizado com a social.plus' };
        }
        return { token: null };
      }

      const userAccessToken = await createUserAccessToken(socialPlusUserId);

      if (!userAccessToken) {
        if (required) {
          return { token: null, error: 'Não foi possível gerar token de autenticação do usuário' };
        }
        return { token: null };
      }

      return { token: userAccessToken };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`[UserTokenService] Erro ao obter token de autenticação do usuário ${userId}:`, error);
      
      if (required) {
        return { token: null, error: `Erro ao obter token de autenticação do usuário: ${errorMessage}` };
      }
      
      return { token: null };
    }
  }

  async getTokenFromRequest(req: { user?: { id: string } }, required = false): Promise<GetTokenResult> {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      if (required) {
        return { token: null, error: 'Usuário não autenticado. Este endpoint requer autenticação do usuário.' };
      }
      return { token: null };
    }

    return this.getToken(currentUserId, required);
  }
}

export const userTokenService = new UserTokenService();

