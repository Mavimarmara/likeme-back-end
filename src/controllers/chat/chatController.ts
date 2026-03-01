import { Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { sendError, sendSuccess } from '@/utils/response';
import { chatService } from '@/services/chat/chatService';

const handleError = (res: Response, error: unknown, operation: string): void => {
  console.error(`${operation} error:`, error);
  const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
  sendError(res, `Erro ao ${operation}: ${errorMessage}`);
};

export const getChannels = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { types } = req.query;

    let channelTypes: ('conversation' | 'broadcast' | 'live' | 'community')[] | undefined;
    if (types) {
      const validTypes = ['conversation', 'broadcast', 'live', 'community'];
      if (typeof types === 'string') {
        const type = types as 'conversation' | 'broadcast' | 'live' | 'community';
        if (validTypes.includes(type)) {
          channelTypes = [type];
        }
      } else if (Array.isArray(types)) {
        channelTypes = types
          .filter((t): t is 'conversation' | 'broadcast' | 'live' | 'community' =>
            typeof t === 'string' && validTypes.includes(t as any)
          );
      }
    }

    const channels = await chatService.getChannels(userId, channelTypes);

    sendSuccess(res, channels, 'Channels obtidos com sucesso');
  } catch (error) {
    handleError(res, error, 'obter channels');
  }
};

export const getChannelMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { channelId } = req.params;
    const limit = parseInt(String(req.query.limit || '20'), 10);

    if (!channelId) {
      sendError(res, 'channelId é obrigatório', 400);
      return;
    }

    const result = await chatService.getChannelMessages(userId, channelId, limit);

    if (!result.success) {
      sendError(res, result.error || 'Erro ao obter mensagens', 400);
      return;
    }

    sendSuccess(res, { ...(result.data as object), currentUserId: userId }, 'Mensagens obtidas com sucesso');
  } catch (error) {
    handleError(res, error, 'obter mensagens do canal');
  }
};

export const sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { channelId } = req.params;
    const { text } = req.body;

    if (!channelId) {
      sendError(res, 'channelId é obrigatório', 400);
      return;
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      sendError(res, 'text é obrigatório e não pode estar vazio', 400);
      return;
    }

    const result = await chatService.sendMessage(userId, channelId, text.trim());

    if (!result.success) {
      sendError(res, result.error || 'Erro ao enviar mensagem', 400);
      return;
    }

    sendSuccess(res, result.data, 'Mensagem enviada com sucesso');
  } catch (error) {
    handleError(res, error, 'enviar mensagem');
  }
};

export const leaveChannel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { channelId } = req.params;

    if (!channelId) {
      sendError(res, 'channelId é obrigatório', 400);
      return;
    }

    const result = await chatService.leaveChannel(userId, channelId);

    if (!result.success) {
      sendError(res, result.error || 'Erro ao sair do canal', 400);
      return;
    }

    sendSuccess(res, result.data, 'Saiu do canal com sucesso');
  } catch (error) {
    handleError(res, error, 'sair do canal');
  }
};

export const blockUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      sendError(res, 'targetUserId é obrigatório', 400);
      return;
    }

    const result = await chatService.blockUser(userId, targetUserId);

    if (!result.success) {
      sendError(res, result.error || 'Erro ao bloquear usuário', 400);
      return;
    }

    sendSuccess(res, result.data, 'Usuário bloqueado com sucesso');
  } catch (error) {
    handleError(res, error, 'bloquear usuário');
  }
};

export const unblockUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { targetUserId } = req.params;

    if (!targetUserId) {
      sendError(res, 'targetUserId é obrigatório', 400);
      return;
    }

    const result = await chatService.unblockUser(userId, targetUserId);

    if (!result.success) {
      sendError(res, result.error || 'Erro ao desbloquear usuário', 400);
      return;
    }

    sendSuccess(res, result.data, 'Usuário desbloqueado com sucesso');
  } catch (error) {
    handleError(res, error, 'desbloquear usuário');
  }
};

export const getBlockedUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const result = await chatService.getBlockedUsers(userId);

    if (!result.success) {
      sendError(res, result.error || 'Erro ao obter usuários bloqueados', 400);
      return;
    }

    sendSuccess(res, result.data, 'Usuários bloqueados obtidos com sucesso');
  } catch (error) {
    handleError(res, error, 'obter usuários bloqueados');
  }
};
