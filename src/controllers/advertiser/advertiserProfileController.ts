import { Response } from 'express';
import prisma from '@/config/database';
import { AuthenticatedRequest } from '@/types';
import { sendError, sendSuccess } from '@/utils/response';

export const getAdvertiserProfilesByAdvertiserId = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const locale = (req.query.locale as string | undefined) || 'pt-BR';

    if (!id) {
      sendError(res, 'Advertiser ID is required', 400);
      return;
    }

    const profiles = await prisma.advertiserProfile.findMany({
      where: {
        advertiserId: id,
        locale,
        isVisible: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    sendSuccess(
      res,
      {
        profiles,
      },
      'Advertiser profiles fetched successfully'
    );
  } catch (error: any) {
    console.error('[AdvertiserProfile] Error fetching advertiser profiles:', error);
    sendError(res, 'Error fetching advertiser profiles', 500, error?.message);
  }
};

