import prisma from '@/config/database';
import type { Activity, Prisma } from '@prisma/client';

export interface ActivityQueryFilters {
  userId?: string;
  type?: string;
  startDate?: Date;
  endDate?: Date;
  includeDeleted?: boolean;
}

export class ActivityService {
  async create(activityData: any): Promise<Activity> {
    return prisma.activity.create({
      data: {
        userId: activityData.userId,
        name: activityData.name,
        type: activityData.type,
        startDate: activityData.startDate ? new Date(activityData.startDate) : new Date(),
        startTime: activityData.startTime || null,
        endDate: activityData.endDate ? new Date(activityData.endDate) : null,
        endTime: activityData.endTime || null,
        location: activityData.location || null,
        description: activityData.description || null,
        reminderEnabled: activityData.reminderEnabled || false,
        reminderOffset: activityData.reminderOffset || null,
      },
    });
  }

  private buildWhereClause(filters: ActivityQueryFilters): Prisma.ActivityWhereInput {
    const where: Prisma.ActivityWhereInput = {};

    // Incluir atividades deletadas apenas se includeDeleted for true
    if (!filters.includeDeleted) {
      where.deletedAt = null;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.startDate) {
      where.startDate = {
        gte: filters.startDate,
      };
    }

    if (filters.endDate) {
      where.endDate = {
        lte: filters.endDate,
      };
    }

    return where;
  }

  async findAll(
    page: number,
    limit: number,
    filters: ActivityQueryFilters
  ): Promise<{ activities: Activity[]; total: number }> {
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(filters);

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        skip,
        take: limit,
        where,
        include: {
          user: {
            include: {
              person: true,
            },
          },
        },
        orderBy: { startDate: 'asc' },
      }),
      prisma.activity.count({ where }),
    ]);

    return { activities, total };
  }

  async findById(id: string): Promise<Activity | null> {
    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            person: true,
          },
        },
      },
    });

    if (!activity || activity.deletedAt) {
      return null;
    }

    return activity;
  }

  async update(id: string, updateData: any): Promise<Activity> {
    const activity = await this.findById(id);
    
    if (!activity) {
      throw new Error('Activity not found');
    }

    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }

    if (updateData.endDate !== undefined) {
      updateData.endDate = updateData.endDate ? new Date(updateData.endDate) : null;
    }

    // Normalizar strings vazias para null
    const normalizedData: any = { ...updateData };
    if (normalizedData.startTime === '') normalizedData.startTime = null;
    if (normalizedData.endTime === '') normalizedData.endTime = null;
    if (normalizedData.location === '') normalizedData.location = null;
    if (normalizedData.description === '') normalizedData.description = null;
    if (normalizedData.reminderOffset === '') normalizedData.reminderOffset = null;

    return prisma.activity.update({
      where: { id },
      data: normalizedData,
      include: {
        user: {
          include: {
            person: true,
          },
        },
      },
    });
  }

  async delete(id: string): Promise<void> {
    const activity = await this.findById(id);
    
    if (!activity) {
      throw new Error('Activity not found');
    }

    await prisma.activity.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const activityService = new ActivityService();
