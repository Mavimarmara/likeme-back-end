import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import prisma from '@/config/database';
import { sendSuccess, sendError } from '@/utils/response';
import { extractAmazonProductData } from '@/utils/amazonScraper';

export const createAd = async (req: Request, res: Response): Promise<void> => {
  try {
    const adData = req.body;

    // Check if advertiser exists (only if advertiserId is provided)
    if (adData.advertiserId) {
      const advertiser = await prisma.advertiser.findUnique({
        where: { id: adData.advertiserId },
      });

      if (!advertiser || advertiser.deletedAt) {
        sendError(res, 'Advertiser not found', 404);
        return;
      }
    }

    // Check if product exists (only if productId is provided)
    if (adData.productId) {
      const product = await prisma.product.findUnique({
        where: { id: adData.productId },
      });

      if (!product || product.deletedAt) {
        sendError(res, 'Product not found', 404);
        return;
      }
    }

    const ad = await prisma.ad.create({
      data: {
        advertiserId: adData.advertiserId,
        productId: adData.productId,
        title: adData.title,
        description: adData.description,
        image: adData.image,
        startDate: adData.startDate ? new Date(adData.startDate) : null,
        endDate: adData.endDate ? new Date(adData.endDate) : null,
        status: adData.status || 'active',
        targetAudience: adData.targetAudience,
        budget: adData.budget,
        externalUrl: adData.externalUrl,
        category: adData.category,
      },
      include: {
        advertiser: true,
        product: true,
      },
    });

    sendSuccess(res, ad, 'Ad created successfully', 201);
  } catch (error) {
    console.error('Create ad error:', error);
    sendError(res, 'Error creating ad');
  }
};

export const getAdById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const ad = await prisma.ad.findUnique({
      where: { id },
      include: {
        advertiser: {
          include: {
            user: {
              include: {
                person: true,
              },
            },
          },
        },
        product: true,
      },
    });

    if (!ad || ad.deletedAt) {
      sendError(res, 'Ad not found', 404);
      return;
    }

    // Se não houver productId mas houver externalUrl, buscar dados do produto
    if (!ad.productId && ad.externalUrl && ad.externalUrl.includes('amazon.')) {
      try {
        const productData = await extractAmazonProductData(ad.externalUrl);
        
        // Adicionar os dados do produto extraído ao objeto de resposta
        const adWithProduct = {
          ...ad,
          product: {
            id: null,
            name: productData.title,
            description: productData.description,
            price: productData.price,
            image: productData.image,
            images: productData.images,
            brand: productData.brand,
            category: ad.category,
            rating: productData.rating,
            reviewCount: productData.reviewCount,
            externalUrl: ad.externalUrl,
            asin: productData.asin,
            // Campos adicionais para manter compatibilidade
            sku: productData.asin,
            cost: null,
            quantity: 0,
            status: 'active',
            weight: null,
            dimensions: null,
            createdAt: ad.createdAt,
            updatedAt: ad.updatedAt,
            deletedAt: null,
          },
        };

        sendSuccess(res, adWithProduct, 'Ad retrieved successfully with external product data');
        return;
      } catch (error: any) {
        console.error('Error fetching external product data:', error);
        // Continuar e retornar o ad sem dados do produto se houver erro
      }
    }

    sendSuccess(res, ad, 'Ad retrieved successfully');
  } catch (error) {
    console.error('Get ad error:', error);
    sendError(res, 'Error retrieving ad');
  }
};

export const getAllAds = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const advertiserId = req.query.advertiserId as string;
    const productId = req.query.productId as string;
    const status = req.query.status as string;
    const category = req.query.category as string;

    const where: any = {
      deletedAt: null,
    };

    if (advertiserId) {
      where.advertiserId = advertiserId;
    }

    if (productId) {
      where.productId = productId;
    }

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    // Filter active ads by date
    if (req.query.activeOnly === 'true') {
      const now = new Date();
      where.status = 'active';
      where.OR = [
        { startDate: null },
        { startDate: { lte: now } },
      ];
      where.AND = [
        {
          OR: [
            { endDate: null },
            { endDate: { gte: now } },
          ],
        },
      ];
    }

    const [ads, total] = await Promise.all([
      prisma.ad.findMany({
        skip,
        take: limit,
        where,
        include: {
          advertiser: true,
          product: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.ad.count({ where }),
    ]);

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
    const updateData = req.body;

    const ad = await prisma.ad.findUnique({
      where: { id },
    });

    if (!ad || ad.deletedAt) {
      sendError(res, 'Ad not found', 404);
      return;
    }

    // Check if advertiser exists if advertiserId is being updated
    if (updateData.advertiserId !== undefined && updateData.advertiserId !== ad.advertiserId) {
      if (updateData.advertiserId) {
        const advertiser = await prisma.advertiser.findUnique({
          where: { id: updateData.advertiserId },
        });

        if (!advertiser || advertiser.deletedAt) {
          sendError(res, 'Advertiser not found', 404);
          return;
        }
      }
    }

    // Check if product exists if productId is being updated
    if (updateData.productId !== undefined && updateData.productId !== ad.productId) {
      if (updateData.productId) {
        const product = await prisma.product.findUnique({
          where: { id: updateData.productId },
        });

        if (!product || product.deletedAt) {
          sendError(res, 'Product not found', 404);
          return;
        }
      }
    }

    // Convert dates if provided
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }

    const updatedAd = await prisma.ad.update({
      where: { id },
      data: updateData,
      include: {
        advertiser: true,
        product: true,
      },
    });

    sendSuccess(res, updatedAd, 'Ad updated successfully');
  } catch (error) {
    console.error('Update ad error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'Ad not found', 404);
      return;
    }
    sendError(res, 'Error updating ad');
  }
};

export const deleteAd = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const ad = await prisma.ad.findUnique({
      where: { id },
    });

    if (!ad || ad.deletedAt) {
      sendError(res, 'Ad not found', 404);
      return;
    }

    await prisma.ad.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    sendSuccess(res, null, 'Ad deleted successfully');
  } catch (error) {
    console.error('Delete ad error:', error);
    if ((error as any).code === 'P2025') {
      sendError(res, 'Ad not found', 404);
      return;
    }
    sendError(res, 'Error deleting ad');
  }
};
