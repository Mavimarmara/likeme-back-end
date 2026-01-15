import type { Activity } from '@prisma/client';
import { getActivityRepository } from '@/utils/repositoryContainer';
import type { ActivityRepository } from '@/repositories';

export interface ActivityQueryFilters {
  userId?: string;
  type?: string;
  startDate?: Date;
  endDate?: Date;
  includeDeleted?: boolean;
}

export class ActivityService {
  private activityRepository: ActivityRepository;

  constructor(activityRepository?: ActivityRepository) {
    this.activityRepository = activityRepository || getActivityRepository();
  }

  private parseDate(dateValue: any): Date {
    if (!dateValue) return new Date();
    
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    if (typeof dateValue === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        const [year, month, day] = dateValue.split('-').map(Number);
        return new Date(year, month - 1, day);
      }
      
      const parsed = new Date(dateValue);
      if (isNaN(parsed.getTime())) {
        throw new Error(`Invalid date format: ${dateValue}. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)`);
      }
      return parsed;
    }
    
    return new Date();
  }

  async create(activityData: any): Promise<Activity> {
    try {
      const startDate = this.parseDate(activityData.startDate);
      const endDate = activityData.endDate ? this.parseDate(activityData.endDate) : undefined;
      
      if (isNaN(startDate.getTime())) {
        throw new Error('Invalid startDate');
      }
      
      if (endDate && isNaN(endDate.getTime())) {
        throw new Error('Invalid endDate');
      }
      
      const result = await this.activityRepository.save({
        userId: activityData.userId,
        name: activityData.name,
        type: activityData.type,
        startDate,
        startTime: activityData.startTime || undefined,
        endDate,
        endTime: activityData.endTime || undefined,
        location: activityData.location || undefined,
        description: activityData.description || undefined,
        reminderEnabled: activityData.reminderEnabled || false,
        reminderOffset: activityData.reminderOffset || undefined,
      });

      // Retornar activity completa
      const activity = await this.activityRepository.findById(result.id);
      return activity as Activity;
    } catch (error: any) {
      if (error.message && error.message.includes('Invalid date')) {
        throw new Error(`Invalid date format: ${error.message}`);
      }
      throw error;
    }
  }

  async findAll(
    page: number,
    limit: number,
    filters: ActivityQueryFilters
  ): Promise<{ activities: Activity[]; total: number }> {
    const repositoryFilters = {
      userId: filters.userId,
      type: filters.type,
      fromDate: filters.startDate,
      toDate: filters.endDate,
    };

    const result = await this.activityRepository.findAllWithUser(page, limit, repositoryFilters);

    return {
      activities: result.activities as Activity[],
      total: result.total,
    };
  }

  async findById(id: string): Promise<Activity | null> {
    const activity = await this.activityRepository.findByIdWithUser(id);

    if (!activity) {
      return null;
    }

    return activity as Activity;
  }

  async update(id: string, updateData: any): Promise<Activity> {
    const activity = await this.activityRepository.findById(id);
    
    if (!activity) {
      throw new Error('Activity not found');
    }

    if (updateData.startDate) {
      const parsedDate = this.parseDate(updateData.startDate);
      updateData.startDate = new Date(Date.UTC(
        parsedDate.getFullYear(),
        parsedDate.getMonth(),
        parsedDate.getDate(),
        0, 0, 0, 0
      ));
    }

    if (updateData.endDate !== undefined) {
      if (updateData.endDate) {
        const parsedDate = this.parseDate(updateData.endDate);
        updateData.endDate = new Date(Date.UTC(
          parsedDate.getFullYear(),
          parsedDate.getMonth(),
          parsedDate.getDate(),
          0, 0, 0, 0
        ));
      } else {
        updateData.endDate = null;
      }
    }

    const normalizedData: any = { ...updateData };
    if (normalizedData.startTime === '') normalizedData.startTime = null;
    if (normalizedData.endTime === '') normalizedData.endTime = null;
    if (normalizedData.location === '') normalizedData.location = null;
    if (normalizedData.description === '') normalizedData.description = null;
    if (normalizedData.reminderOffset === '') normalizedData.reminderOffset = null;

    await this.activityRepository.update(id, normalizedData);

    // Retornar activity atualizada com includes
    return (await this.findById(id))!;
  }

  async delete(id: string): Promise<void> {
    const activity = await this.activityRepository.findById(id);
    
    if (!activity) {
      throw new Error('Activity not found');
    }

    await this.activityRepository.delete(id);
  }
}

export const activityService = new ActivityService();
