import { getActivityRepository } from '@/utils/repositoryContainer';
import { notificationService } from '@/services/notification/notificationService';
import type { ActivityRepository, ActivityData } from '@/repositories/activity/ActivityRepository';

export class ReminderService {
  private activityRepository: ActivityRepository;

  constructor(activityRepository?: ActivityRepository) {
    this.activityRepository = activityRepository || getActivityRepository();
  }

  async processReminders(): Promise<{ sent: number; errors: number }> {
    const pendingActivities = await this.activityRepository.findPendingReminders();
    const now = new Date();

    let sent = 0;
    let errors = 0;

    for (const activity of pendingActivities) {
      try {
        const reminderTime = this.calculateReminderTime(activity);
        if (!reminderTime) continue;

        if (now >= reminderTime) {
          const payload = this.buildNotificationPayload(activity);
          await notificationService.sendToUser(activity.userId, payload);
          await this.activityRepository.markReminderSent(activity.id);
          sent++;
          console.log(`[Reminder] Notificação enviada para atividade "${activity.name}" (${activity.id})`);
        }
      } catch (error) {
        errors++;
        console.error(`[Reminder] Erro ao processar atividade ${activity.id}:`, error);
      }
    }

    return { sent, errors };
  }

  private calculateReminderTime(activity: ActivityData): Date | null {
    const { startDate, startTime, reminderOffset } = activity;

    if (!startDate) return null;

    const activityDateTime = new Date(startDate);

    if (startTime) {
      const [hours, minutes] = startTime.split(':').map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        activityDateTime.setUTCHours(hours, minutes, 0, 0);
      }
    }

    const offsetMinutes = parseInt(reminderOffset || '0', 10);
    if (isNaN(offsetMinutes)) return activityDateTime;

    return new Date(activityDateTime.getTime() - offsetMinutes * 60 * 1000);
  }

  private buildNotificationPayload(activity: ActivityData) {
    const timeStr = activity.startTime || '';
    const body = timeStr
      ? `${activity.name} começa às ${timeStr} — não perca!`
      : `${activity.name} está agendado para hoje — não perca!`;

    return {
      title: '⏰ Lembrete de Atividade',
      body,
      data: {
        type: 'activity_reminder',
        activityId: activity.id,
      },
    };
  }
}

export const reminderService = new ReminderService();
