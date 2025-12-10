import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import prisma from '@/config/database';
import { sendSuccess, sendError } from '@/utils/response';

export const createAdvertiser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const advertiserData = req.body;
    const userId = req.user?.id || advertiserData.userId;

    if (!userId) {
      sendError(res, 'User not identified', 400);
      return;
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      sendError(res, 'User not found', 404);
      return;
    }

    // Check if advertiser already exists for this user
    const existingAdvertiser = await prisma.advertiser.findUnique({
      where: { userId },
    });

    if (existingAdvertiser) {
      sendError(res, 'User is already an advertiser', 409);
      return;
    }

    const advertiser = await prisma.advertiser.create({
      data: {
        userId,
        name: advertiserData.name,
        description: advertiserData.description,
        logo: advertiserData.logo,
        contactEmail: advertiserData.contactEmail,
        contactPhone: advertiserData.contactPhone,
        website: advertiserData.website,
        status: advertiserData.status || 'active',
      },
      include: {
        user: {
          include: {
            person: true,
          },
        },
      },
    });

    sendSuccess(res, advertiser, 'Advertiser created successfully', 201);
  } catch (error) {
    console.error('Create advertiser error:', error);
    sendError(res, 'Error creating advertiser');
  }
};

export const getAdvertiserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const advertiser = await prisma.advertiser.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            person: true,
          },
        },
        ads: {
          where: { deletedAt: null },
          include: {
            product: true,
          },
        },
      },
    });

    if (!advertiser || advertiser.deletedAt) {
      sendError(res, 'Advertiser not found', 404);
      return;
    }

    sendSuccess(res, advertiser, 'Advertiser retrieved successfully');
  } catch (error) {
    console.error('Get advertiser error:', error);
    sendError(res, 'Error retrieving advertiser');
  }
};

export const getAdvertiserByUserId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const advertiser = await prisma.advertiser.findUnique({
      where: { userId },
      include: {
        user: {
          include: {
            person: true,
          },
        },
        ads: {
          where: { deletedAt: null },
          include: {
            product: true,
          },
        },
      },
    });

    if (!advertiser || advertiser.deletedAt) {
      sendError(res, 'Advertiser not found', 404);
      return;
    }

    sendSuccess(res, advertiser, 'Advertiser retrieved successfully');
  } catch (error) {
    console.error('Get advertiser by user id error:', error);
    sendError(res, 'Error retrieving advertiser');
  }
};

export const getAllAdvertisers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const where: any = {
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [advertisers, total] = await Promise.all([
      prisma.advertiser.findMany({
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
        orderBy: { createdAt: 'desc' },
      }),
      prisma.advertiser.count({ where }),
    ]);

    sendSuccess(res, {
      advertisers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Advertisers retrieved successfully');
  } catch (error) {
    console.error('Get all advertisers error:', error);
    sendError(res, 'Error retrieving advertisers');
  }
};

export const updateAdvertiser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const currentUserId = req.user?.id;

    const advertiser = await prisma.advertiser.findUnique({
      where: { id },
    });

    if (!advertiser || advertiser.deletedAt) {
      sendError(res, 'Advertiser not found', 404);
      return;
    }

    // Check if user has permission to update
    if (currentUserId && advertiser.userId !== currentUserId) {
      sendError(res, 'Not authorized to update this advertiser', 403);
      return;
    }

    const updatedAdvertiser = await prisma.advertiser.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          include: {
            person: true,
          },
        },
      },
    });

    sendSuccess(res, updatedAdvertiser, 'Advertiser updated successfully');
  } catch (error) {
    console.error('Update advertiser error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'Advertiser not found', 404);
      return;
    }
    sendError(res, 'Error updating advertiser');
  }
};

export const deleteAdvertiser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    const advertiser = await prisma.advertiser.findUnique({
      where: { id },
    });

    if (!advertiser || advertiser.deletedAt) {
      sendError(res, 'Advertiser not found', 404);
      return;
    }

    // Check if user has permission to delete
    if (currentUserId && advertiser.userId !== currentUserId) {
      sendError(res, 'Not authorized to delete this advertiser', 403);
      return;
    }

    await prisma.advertiser.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    sendSuccess(res, null, 'Advertiser deleted successfully');
  } catch (error) {
    console.error('Delete advertiser error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'Advertiser not found', 404);
      return;
    }
    sendError(res, 'Error deleting advertiser');
  }
};
