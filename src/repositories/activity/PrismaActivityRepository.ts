import prisma from '@/config/database';
import type {
  ActivityRepository,
  CreateActivityData,
  ActivityData,
  ActivityWithUserData,
  UpdateActivityData,
  ActivityFilters,
} from './ActivityRepository';

export class PrismaActivityRepository implements ActivityRepository {
  async save(data: CreateActivityData): Promise<{ id: string }> {
    const activity = await prisma.activity.create({
      data: {
        userId: data.userId,
        name: data.name,
        type: data.type,
        startDate: data.startDate,
        startTime: data.startTime,
        endDate: data.endDate,
        endTime: data.endTime,
        location: data.location,
        description: data.description,
        reminderEnabled: data.reminderEnabled ?? false,
        reminderOffset: data.reminderOffset,
      },
      select: { id: true },
    });

    return { id: activity.id };
  }

  async findById(id: string): Promise<ActivityData | null> {
    const activity = await prisma.activity.findUnique({
      where: { id },
    });

    return activity ? this.mapToActivityData(activity) : null;
  }

  async findByIdWithUser(id: string): Promise<ActivityWithUserData | null> {
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

    return this.mapToActivityWithUserData(activity);
  }

  async findAll(filters?: ActivityFilters): Promise<ActivityData[]> {
    const where: any = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.fromDate || filters?.toDate) {
      where.startDate = {};
      if (filters.fromDate) where.startDate.gte = filters.fromDate;
      if (filters.toDate) where.startDate.lte = filters.toDate;
    }

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { startDate: 'desc' },
    });

    return activities.map((a) => this.mapToActivityData(a));
  }

  async findAllWithUser(
    page: number,
    limit: number,
    filters?: ActivityFilters
  ): Promise<{ activities: ActivityWithUserData[]; total: number }> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.fromDate || filters?.toDate) {
      where.startDate = {};
      if (filters.fromDate) where.startDate.gte = filters.fromDate;
      if (filters.toDate) where.startDate.lte = filters.toDate;
    }

    // Incluir apenas não deletados por padrão
    where.deletedAt = null;

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

    return {
      activities: activities.map((a) => this.mapToActivityWithUserData(a)),
      total,
    };
  }

  async findByUserId(userId: string): Promise<ActivityData[]> {
    const activities = await prisma.activity.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
    });

    return activities.map((a) => this.mapToActivityData(a));
  }

  async update(id: string, data: UpdateActivityData): Promise<void> {
    await prisma.activity.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        startDate: data.startDate,
        startTime: data.startTime,
        endDate: data.endDate,
        endTime: data.endTime,
        location: data.location,
        description: data.description,
        reminderEnabled: data.reminderEnabled,
        reminderOffset: data.reminderOffset,
      },
    });
  }

  async delete(id: string): Promise<void> {
    // Soft delete - apenas marca como deletado
    await prisma.activity.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  private mapToActivityData(activity: any): ActivityData {
    return {
      id: activity.id,
      userId: activity.userId,
      name: activity.name,
      type: activity.type,
      startDate: activity.startDate,
      startTime: activity.startTime,
      endDate: activity.endDate,
      endTime: activity.endTime,
      location: activity.location,
      description: activity.description,
      reminderEnabled: activity.reminderEnabled,
      reminderOffset: activity.reminderOffset,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
      deletedAt: activity.deletedAt,
    };
  }

  private mapToActivityWithUserData(activity: any): ActivityWithUserData {
    return {
      ...this.mapToActivityData(activity),
      user: {
        id: activity.user.id,
        username: activity.user.username,
        person: {
          id: activity.user.person.id,
          firstName: activity.user.person.firstName,
          lastName: activity.user.person.lastName,
        },
      },
    };
  }
}
