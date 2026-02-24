import { Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { notificationService } from '@/services/notification/notificationService';

/**
 * @swagger
 * /api/notifications/register-token:
 *   post:
 *     tags: [Notifications]
 *     summary: Registra um FCM token do dispositivo
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, platform]
 *             properties:
 *               token:
 *                 type: string
 *               platform:
 *                 type: string
 *                 enum: [ios, android]
 *     responses:
 *       200:
 *         description: Token registrado
 */
export const registerToken = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }

    const { token, platform } = req.body;

    if (!token || !platform) {
      return res.status(400).json({ success: false, message: 'Token e platform são obrigatórios' });
    }

    if (!['ios', 'android'].includes(platform)) {
      return res.status(400).json({ success: false, message: 'Platform deve ser ios ou android' });
    }

    await notificationService.registerToken(userId, token, platform);

    return res.status(200).json({ success: true, message: 'Token registrado com sucesso' });
  } catch (error) {
    console.error('[Notification] Erro ao registrar token:', error);
    return res.status(500).json({ success: false, message: 'Erro ao registrar token' });
  }
};

/**
 * @swagger
 * /api/notifications/unregister-token:
 *   post:
 *     tags: [Notifications]
 *     summary: Remove um FCM token do dispositivo
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token removido
 */
export const unregisterToken = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Token é obrigatório' });
    }

    await notificationService.unregisterToken(token);

    return res.status(200).json({ success: true, message: 'Token removido com sucesso' });
  } catch (error) {
    console.error('[Notification] Erro ao remover token:', error);
    return res.status(500).json({ success: false, message: 'Erro ao remover token' });
  }
};

/**
 * @swagger
 * /api/notifications/send:
 *   post:
 *     tags: [Notifications]
 *     summary: Envia notificação push para um ou mais usuários
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, body]
 *             properties:
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               topic:
 *                 type: string
 *               broadcast:
 *                 type: boolean
 *               data:
 *                 type: object
 *               imageUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Notificação enviada
 */
export const sendNotification = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, body, userIds, topic, broadcast, data, imageUrl } = req.body;

    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Title e body são obrigatórios' });
    }

    const payload = { title, body, data, imageUrl };

    if (topic) {
      const messageId = await notificationService.sendToTopic(topic, payload);
      return res.status(200).json({ success: true, data: { messageId } });
    }

    if (broadcast) {
      const result = await notificationService.sendToAll(payload);
      return res.status(200).json({ success: true, data: result });
    }

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      const result = await notificationService.sendToUsers(userIds, payload);
      return res.status(200).json({ success: true, data: result });
    }

    return res.status(400).json({
      success: false,
      message: 'Informe userIds, topic ou broadcast: true',
    });
  } catch (error) {
    console.error('[Notification] Erro ao enviar notificação:', error);
    return res.status(500).json({ success: false, message: 'Erro ao enviar notificação' });
  }
};
