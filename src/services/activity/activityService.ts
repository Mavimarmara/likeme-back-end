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
  private parseDate(dateValue: any): Date {
    if (!dateValue) return new Date();
    
    // Se já for uma Date, retornar
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    // Se for string, tentar parsear
    if (typeof dateValue === 'string') {
      // Se for formato YYYY-MM-DD, criar como data local (não UTC) para evitar problemas de timezone
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        // Parsear como data local (não UTC) para preservar o dia correto
        const [year, month, day] = dateValue.split('-').map(Number);
        // month - 1 porque Date usa 0-indexed months
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
      const endDate = activityData.endDate ? this.parseDate(activityData.endDate) : null;
      
      // Validar que startDate é válida
      if (isNaN(startDate.getTime())) {
        throw new Error('Invalid startDate');
      }
      
      // Validar que endDate é válida (se fornecida)
      if (endDate && isNaN(endDate.getTime())) {
        throw new Error('Invalid endDate');
      }
      
      return prisma.activity.create({
        data: {
          userId: activityData.userId,
          name: activityData.name,
          type: activityData.type,
          startDate,
          startTime: activityData.startTime || null,
          endDate,
          endTime: activityData.endTime || null,
          location: activityData.location || null,
          description: activityData.description || null,
          reminderEnabled: activityData.reminderEnabled || false,
          reminderOffset: activityData.reminderOffset || null,
        },
      });
    } catch (error: any) {
      // Re-throw com mensagem mais clara
      if (error.message && error.message.includes('Invalid date')) {
        throw new Error(`Invalid date format: ${error.message}`);
      }
      throw error;
    }
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
      const parsedDate = this.parseDate(updateData.startDate);
      // Normalizar para meia-noite UTC para evitar problemas de timezone
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
        // Normalizar para meia-noite UTC para evitar problemas de timezone
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
