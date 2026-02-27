import { Router, Request, Response } from 'express';
import { reminderService } from '@/services/reminder/reminderService';

const router = Router();

function verifyCronSecret(req: Request, res: Response, next: Function): void {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('[Cron] CRON_SECRET não configurado. Acesso negado.');
    res.status(403).json({ success: false, message: 'Cron not configured' });
    return;
  }

  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  next();
}

/**
 * @swagger
 * /api/cron/reminders:
 *   get:
 *     summary: Processa lembretes de atividades pendentes
 *     description: Endpoint chamado pelo Vercel Cron para enviar push notifications de lembretes
 *     tags: [Cron]
 *     security:
 *       - cronSecret: []
 *     responses:
 *       200:
 *         description: Lembretes processados
 *       401:
 *         description: Não autorizado
 */
router.get('/reminders', verifyCronSecret, async (_req: Request, res: Response) => {
  try {
    console.log('[Cron] Processando lembretes...');
    const result = await reminderService.processReminders();
    console.log(`[Cron] Resultado: ${result.sent} enviados, ${result.errors} erros`);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[Cron] Erro ao processar lembretes:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro interno',
    });
  }
});

export default router;
