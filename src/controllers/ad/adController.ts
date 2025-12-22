import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { sendSuccess, sendError } from '@/utils/response';
import { adService } from '@/services/adService';

export const createAd = async (req: Request, res: Response): Promise<void> => {
  try {
    const ad = await adService.create(req.body);
    sendSuccess(res, ad, 'Ad created successfully', 201);
  } catch (error: any) {
    console.error('Create ad error:', error);
    
    if (error.message === 'Advertiser not found') {
      sendError(res, error.message, 404);
      return;
    }
    
    if (error.message === 'Product not found' || error.message.includes('Product data is required')) {
      sendError(res, error.message, 400);
      return;
    }
    
    sendError(res, 'Error creating ad');
  }
};

export const getAdById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const ad = await adService.findByIdWithAmazonData(id);

    if (!ad) {
      sendError(res, 'Ad not found', 404);
      return;
    }

    const message = ad.product?.externalUrl 
      ? 'Ad retrieved successfully with external product data'
      : 'Ad retrieved successfully';

    sendSuccess(res, ad, message);
  } catch (error) {
    console.error('Get ad error:', error);
    sendError(res, 'Error retrieving ad');
  }
};

export const getAllAds = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const activeOnly = req.query.activeOnly === 'true' || 
                       req.query.activeOnly === '1' || 
                       String(req.query.activeOnly).toLowerCase() === 'true';

    const filters = {
      advertiserId: req.query.advertiserId as string,
      productId: req.query.productId as string,
      status: req.query.status as string,
      category: req.query.category as string,
      activeOnly,
    };

    const { ads, total } = await adService.findAll(page, limit, filters);
    // findAll já faz o enriquecimento, não precisa chamar novamente
    // const adsWithAmazonData = await adService.enrichAdsWithAmazonData(ads);

    sendSuccess(res, {
      ads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Ads retrieved successfully');
  } catch (error) {
    console.error('Get all ads error:', error);
    sendError(res, 'Error retrieving ads');
  }
};

export const updateAd = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updatedAd = await adService.update(id, req.body);
    sendSuccess(res, updatedAd, 'Ad updated successfully');
  } catch (error: any) {
    console.error('Update ad error:', error);
    
    if (error.message === 'Ad not found' || (error as any).code === 'P2025') {
      sendError(res, 'Ad not found', 404);
      return;
    }
    
    if (error.message === 'Advertiser not found') {
      sendError(res, error.message, 404);
      return;
    }
    
    if (error.message === 'Product not found') {
      sendError(res, error.message, 404);
      return;
    }
    
    sendError(res, 'Error updating ad');
  }
};

export const deleteAd = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await adService.delete(id);
    sendSuccess(res, null, 'Ad deleted successfully');
  } catch (error: any) {
    console.error('Delete ad error:', error);
    
    if (error.message === 'Ad not found' || (error as any).code === 'P2025') {
      sendError(res, 'Ad not found', 404);
      return;
    }
    
    sendError(res, 'Error deleting ad');
  }
};
