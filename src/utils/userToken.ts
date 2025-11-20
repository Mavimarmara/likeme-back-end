import { AuthenticatedRequest } from '@/types';
import { createUserAccessToken } from './amityClient';
import prisma from '@/config/database';

/**
 * Obtém o token de acesso do usuário autenticado
 * @param req - Request autenticado
 * @param required - Se true, retorna erro se o usuário não estiver autenticado ou não tiver token
 * @returns Token de acesso ou null
 */
export const getUserAccessToken = async (
  req: AuthenticatedRequest,
  required = false
): Promise<{ token: string | null; error?: string }> => {
  const currentUserId = req.user?.id;

  if (!currentUserId) {
    if (required) {
      return { token: null, error: 'Usuário não autenticado. Este endpoint requer autenticação do usuário.' };
    }
    return { token: null };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
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
    console.error(`[UserToken] Erro ao obter token de autenticação do usuário ${currentUserId}:`, error);
    
    if (required) {
      return { token: null, error: `Erro ao obter token de autenticação do usuário: ${errorMessage}` };
    }
    
    return { token: null };
  }
};






