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

    // Product is now required - either existing productId or create new product
    let productId = adData.productId;

    if (!productId) {
      // Create a new product if productId is not provided
      if (!adData.product) {
        sendError(res, 'Product data is required when productId is not provided', 400);
        return;
      }

      const product = await prisma.product.create({
        data: {
          name: adData.product.name || '',
          description: adData.product.description,
          image: adData.product.image,
          price: adData.product.price ?? null,
          quantity: adData.product.quantity ?? null,
          category: adData.product.category,
          externalUrl: adData.product.externalUrl,
          status: adData.product.status || 'active',
        },
      });
      productId = product.id;
    } else {
      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product || product.deletedAt) {
        sendError(res, 'Product not found', 404);
        return;
      }
    }

    const ad = await prisma.ad.create({
      data: {
        advertiserId: adData.advertiserId,
        productId: productId,
        startDate: adData.startDate ? new Date(adData.startDate) : null,
        endDate: adData.endDate ? new Date(adData.endDate) : null,
        status: adData.status || 'active',
        targetAudience: adData.targetAudience,
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

    // Se houver product com externalUrl, buscar dados atualizados da URL externa
    // Quando externalUrl existe, priorizar dados da URL sobre os dados salvos (podem estar vazios)
    if (ad.product?.externalUrl && ad.product.externalUrl.includes('amazon.')) {
      try {
        const productData = await extractAmazonProductData(ad.product.externalUrl);
        
        // Priorizar dados da URL externa sobre os dados salvos
        // Se houver externalUrl, os campos do produto podem estar vazios e serão preenchidos da URL
        const adWithProduct = {
          ...ad,
          product: {
            ...ad.product,
            name: productData.title || ad.product.name || '',
            description: productData.description || ad.product.description || '',
            price: productData.price ? parseFloat(productData.price.toString()) : (ad.product.price ? parseFloat(ad.product.price.toString()) : null),
            image: productData.image || ad.product.image || '',
            brand: productData.brand || ad.product.brand,
            // Campos adicionais para manter compatibilidade com frontend
            images: productData.images,
            rating: productData.rating,
            reviewCount: productData.reviewCount,
            asin: productData.asin,
          },
        };

        sendSuccess(res, adWithProduct, 'Ad retrieved successfully with external product data');
        return;
      } catch (error: any) {
        console.error('Error fetching external product data:', error);
        // Continuar e retornar o ad com dados do produto salvos se houver erro
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

    // Filter by product category if provided
    if (category) {
      where.product = {
        category: category,
      };
    }

    // Filter active ads by date
    const activeOnly = req.query.activeOnly;
    if (activeOnly === 'true' || activeOnly === '1' || String(activeOnly).toLowerCase() === 'true') {
      const now = new Date();
      
      // Set status to active if not already set
      if (!where.status) {
        where.status = 'active';
      }
      
      // Ads are active if:
      // 1. startDate is null OR startDate <= now (ad has started)
      // 2. endDate is null OR endDate >= now (ad hasn't ended)
      // Combine with existing filters using AND
      const existingAnd = where.AND || [];
      where.AND = [
        ...existingAnd,
        {
          OR: [
            { startDate: null },
            { startDate: { lte: now } },
          ],
        },
        {
          OR: [
            { endDate: null },
            { endDate: { gte: now } },
          ],
        },
      ];
    }

    // Debug log
    if (process.env.NODE_ENV === 'development') {
      console.log('GetAllAds - Query params:', req.query);
      console.log('GetAllAds - Where clause:', JSON.stringify(where, null, 2));
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

    // Debug log
    if (process.env.NODE_ENV === 'development') {
      console.log(`GetAllAds - Found ${ads.length} ads (total: ${total})`);
    }

    // Para cada ad com product.externalUrl (Amazon), buscar dados atualizados
    const adsWithProductData = await Promise.all(
      ads.map(async (ad) => {
        // Se houver product com externalUrl da Amazon, buscar dados atualizados
        if (ad.product?.externalUrl && ad.product.externalUrl.includes('amazon.')) {
          try {
            const productData = await extractAmazonProductData(ad.product.externalUrl);
            
            // Priorizar dados da URL externa sobre os dados salvos
            return {
              ...ad,
              product: {
                ...ad.product,
                name: productData.title || ad.product.name || '',
                description: productData.description || ad.product.description || '',
                price: productData.price ? parseFloat(productData.price.toString()) : (ad.product.price ? parseFloat(ad.product.price.toString()) : null),
                image: productData.image || ad.product.image || '',
                brand: productData.brand || ad.product.brand,
                // Campos adicionais para manter compatibilidade com frontend
                images: productData.images,
                rating: productData.rating,
                reviewCount: productData.reviewCount,
                asin: productData.asin,
              },
            };
          } catch (error: any) {
            console.error(`Error fetching external product data for ad ${ad.id}:`, error);
            // Retornar ad com dados salvos se houver erro no scraping
            return ad;
          }
        }
        // Retornar ad sem modificação se não tiver externalUrl
        return ad;
      })
    );

    sendSuccess(res, {
      ads: adsWithProductData,
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
