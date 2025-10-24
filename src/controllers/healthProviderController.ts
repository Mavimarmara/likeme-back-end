import { Request, Response } from 'express';
import prisma from '@/config/database';
import { sendSuccess, sendError, sendPaginated } from '@/utils/response';
import { CreateHealthProviderData, UpdateHealthProviderData, CreateAppointmentData, UpdateAppointmentData, SearchQuery } from '@/types';

// Health Provider controllers
export const createHealthProvider = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const providerData: CreateHealthProviderData = req.body;

    // Check if user already has a health provider profile
    const existingProvider = await prisma.healthProvider.findUnique({
      where: { userId },
    });

    if (existingProvider) {
      sendError(res, 'Usuário já possui perfil de provedor de saúde', 409);
      return;
    }

    const provider = await prisma.healthProvider.create({
      data: {
        userId,
        ...providerData,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
      },
    });

    sendSuccess(res, provider, 'Provedor de saúde criado com sucesso', 201);
  } catch (error) {
    console.error('Create health provider error:', error);
    sendError(res, 'Erro ao criar provedor de saúde');
  }
};

export const getHealthProviders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, specialty, search, sortBy = 'createdAt', sortOrder = 'desc' }: any = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { isAvailable: true };

    if (specialty) {
      where.specialty = specialty;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { specialty: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [providers, total] = await Promise.all([
      prisma.healthProvider.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.healthProvider.count({ where }),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    sendPaginated(res, providers, {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
    }, 'Provedores de saúde obtidos com sucesso');
  } catch (error) {
    console.error('Get health providers error:', error);
    sendError(res, 'Erro ao obter provedores de saúde');
  }
};

export const getHealthProvider = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const provider = await prisma.healthProvider.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
      },
    });

    if (!provider) {
      sendError(res, 'Provedor de saúde não encontrado', 404);
      return;
    }

    sendSuccess(res, provider, 'Provedor de saúde obtido com sucesso');
  } catch (error) {
    console.error('Get health provider error:', error);
    sendError(res, 'Erro ao obter provedor de saúde');
  }
};

export const updateHealthProvider = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const updateData: UpdateHealthProviderData = req.body;

    const provider = await prisma.healthProvider.findFirst({
      where: { id, userId },
    });

    if (!provider) {
      sendError(res, 'Provedor de saúde não encontrado ou você não tem permissão para editá-lo', 404);
      return;
    }

    const updatedProvider = await prisma.healthProvider.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
      },
    });

    sendSuccess(res, updatedProvider, 'Provedor de saúde atualizado com sucesso');
  } catch (error) {
    console.error('Update health provider error:', error);
    sendError(res, 'Erro ao atualizar provedor de saúde');
  }
};

export const deleteHealthProvider = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const provider = await prisma.healthProvider.findFirst({
      where: { id, userId },
    });

    if (!provider) {
      sendError(res, 'Provedor de saúde não encontrado ou você não tem permissão para deletá-lo', 404);
      return;
    }

    await prisma.healthProvider.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Provedor de saúde deletado com sucesso');
  } catch (error) {
    console.error('Delete health provider error:', error);
    sendError(res, 'Erro ao deletar provedor de saúde');
  }
};

// Appointment controllers
export const createAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const appointmentData: CreateAppointmentData = req.body;

    // Check if provider exists and is available
    const provider = await prisma.healthProvider.findUnique({
      where: { id: appointmentData.providerId },
    });

    if (!provider || !provider.isAvailable) {
      sendError(res, 'Provedor de saúde não encontrado ou não disponível', 404);
      return;
    }

    // Check for conflicting appointments
    const appointmentDate = new Date(appointmentData.date);
    const endTime = new Date(appointmentDate.getTime() + appointmentData.duration * 60000);

    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        providerId: appointmentData.providerId,
        status: 'scheduled',
        OR: [
          {
            date: {
              gte: appointmentDate,
              lt: endTime,
            },
          },
          {
            date: {
              lt: appointmentDate,
              gte: new Date(appointmentDate.getTime() - appointmentData.duration * 60000),
            },
          },
        ],
      },
    });

    if (conflictingAppointment) {
      sendError(res, 'Já existe um agendamento neste horário', 409);
      return;
    }

    const appointment = await prisma.appointment.create({
      data: {
        userId,
        providerId: appointmentData.providerId,
        date: appointmentDate,
        duration: appointmentData.duration,
        notes: appointmentData.notes,
      },
      include: {
        provider: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatar: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
      },
    });

    sendSuccess(res, appointment, 'Agendamento criado com sucesso', 201);
  } catch (error) {
    console.error('Create appointment error:', error);
    sendError(res, 'Erro ao criar agendamento');
  }
};

export const getAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { page = 1, limit = 10, status, providerId }: any = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    if (providerId) {
      where.providerId = providerId;
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { date: 'asc' },
        include: {
          provider: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  avatar: true,
                },
              },
            },
          },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    sendPaginated(res, appointments, {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
    }, 'Agendamentos obtidos com sucesso');
  } catch (error) {
    console.error('Get appointments error:', error);
    sendError(res, 'Erro ao obter agendamentos');
  }
};

export const getAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const appointment = await prisma.appointment.findFirst({
      where: { id, userId },
      include: {
        provider: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatar: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
      },
    });

    if (!appointment) {
      sendError(res, 'Agendamento não encontrado', 404);
      return;
    }

    sendSuccess(res, appointment, 'Agendamento obtido com sucesso');
  } catch (error) {
    console.error('Get appointment error:', error);
    sendError(res, 'Erro ao obter agendamento');
  }
};

export const updateAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const updateData: UpdateAppointmentData = req.body;

    const appointment = await prisma.appointment.findFirst({
      where: { id, userId },
    });

    if (!appointment) {
      sendError(res, 'Agendamento não encontrado ou você não tem permissão para editá-lo', 404);
      return;
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...updateData,
        date: updateData.date ? new Date(updateData.date) : undefined,
      },
      include: {
        provider: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatar: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
      },
    });

    sendSuccess(res, updatedAppointment, 'Agendamento atualizado com sucesso');
  } catch (error) {
    console.error('Update appointment error:', error);
    sendError(res, 'Erro ao atualizar agendamento');
  }
};

export const deleteAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const appointment = await prisma.appointment.findFirst({
      where: { id, userId },
    });

    if (!appointment) {
      sendError(res, 'Agendamento não encontrado ou você não tem permissão para deletá-lo', 404);
      return;
    }

    await prisma.appointment.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Agendamento deletado com sucesso');
  } catch (error) {
    console.error('Delete appointment error:', error);
    sendError(res, 'Erro ao deletar agendamento');
  }
};
