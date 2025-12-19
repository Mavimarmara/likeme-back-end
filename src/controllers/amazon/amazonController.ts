import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { sendSuccess, sendError } from '@/utils/response';
import prisma from '@/config/database';
import { extractAmazonProductData } from '@/utils/amazonScraper';

/**
 * Busca produto da Amazon a partir de uma URL externa (web scraping)
 */
export const getProductByUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const { externalUrl } = req.query;

    if (!externalUrl || typeof externalUrl !== 'string') {
      sendError(res, 'externalUrl parameter is required', 400);
      return;
    }

    // Validar se é uma URL válida da Amazon
    if (!externalUrl.includes('amazon.')) {
      sendError(res, 'Invalid Amazon URL', 400);
      return;
    }

    // Extrair dados da página usando web scraping
    const productData = await extractAmazonProductData(externalUrl);

    if (!productData.title) {
      sendError(res, 'Could not extract product data from Amazon page', 404);
      return;
    }

    sendSuccess(res, productData, 'Amazon product data extracted successfully');
  } catch (error: any) {
    console.error('Get Amazon product by URL error:', error);
    sendError(res, `Error retrieving Amazon product: ${error.message}`, 500, error.message);
  }
};

/**
 * Busca produto da Amazon a partir de um anúncio (ad)
 */
export const getProductByAd = async (req: Request, res: Response): Promise<void> => {
  try {
    const { adId } = req.params;

    if (!adId) {
      sendError(res, 'adId parameter is required', 400);
      return;
    }

    // Buscar o anúncio com produto
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      include: {
        product: true,
      },
    });

    if (!ad || ad.deletedAt) {
      sendError(res, 'Ad not found', 404);
      return;
    }

    if (!ad.product?.externalUrl) {
      sendError(res, 'Ad product does not have an external URL', 400);
      return;
    }

    // Validar se é uma URL válida da Amazon
    if (!ad.product.externalUrl.includes('amazon.')) {
      sendError(res, 'Ad product external URL is not a valid Amazon URL', 400);
      return;
    }

    // Extrair dados da página usando web scraping
    const productData = await extractAmazonProductData(ad.product.externalUrl);

    if (!productData.title) {
      sendError(res, 'Could not extract product data from Amazon page', 404);
      return;
    }

    // Combinar dados do produto extraído com dados do anúncio e produto
    const normalizedProduct = {
      ...productData,
      externalUrl: ad.product.externalUrl,
      ad: {
        id: ad.id,
        status: ad.status,
        startDate: ad.startDate,
        endDate: ad.endDate,
      },
      product: ad.product ? {
        id: ad.product.id,
        name: productData.title || ad.product.name,
        description: productData.description || ad.product.description,
        category: ad.product.category,
      } : null,
    };

    sendSuccess(res, normalizedProduct, 'Amazon product retrieved successfully');
  } catch (error: any) {
    console.error('Get Amazon product by ad error:', error);
    sendError(res, `Error retrieving Amazon product: ${error.message}`, 500, error.message);
  }
};

