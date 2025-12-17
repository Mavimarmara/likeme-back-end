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

    // Buscar o anúncio
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
    });

    if (!ad || ad.deletedAt) {
      sendError(res, 'Ad not found', 404);
      return;
    }

    if (!ad.externalUrl) {
      sendError(res, 'Ad does not have an external URL', 400);
      return;
    }

    // Validar se é uma URL válida da Amazon
    if (!ad.externalUrl.includes('amazon.')) {
      sendError(res, 'Ad external URL is not a valid Amazon URL', 400);
      return;
    }

    // Extrair dados da página usando web scraping
    const productData = await extractAmazonProductData(ad.externalUrl);

    if (!productData.title) {
      sendError(res, 'Could not extract product data from Amazon page', 404);
      return;
    }

    // Combinar dados do produto extraído com dados do anúncio
    const normalizedProduct = {
      ...productData,
      externalUrl: ad.externalUrl,
      ad: {
        id: ad.id,
        title: ad.title,
        description: ad.description,
        category: ad.category,
      },
    };

    sendSuccess(res, normalizedProduct, 'Amazon product retrieved successfully');
  } catch (error: any) {
    console.error('Get Amazon product by ad error:', error);
    sendError(res, `Error retrieving Amazon product: ${error.message}`, 500, error.message);
  }
};

/**
 * Busca produtos da Amazon usando palavras-chave (web scraping da página de busca)
 */
export const searchProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { keywords } = req.query;

    if (!keywords || typeof keywords !== 'string') {
      sendError(res, 'keywords parameter is required', 400);
      return;
    }

    // Construir URL de busca da Amazon
    const searchUrl = `https://www.amazon.com.br/s?k=${encodeURIComponent(keywords)}&ref=sr_pg_1`;

    // Fazer requisição para a página de busca
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Amazon search page: ${response.status}`);
    }

    const html = await response.text();

    // Extrair produtos da página de busca
    const products: any[] = [];
    
    // Padrão para encontrar produtos na página de busca
    const productRegex = /<div[^>]*data-asin="([^"]+)"[^>]*data-index="[^"]*"[^>]*>([\s\S]*?)<\/div><\/div><\/div>/gi;
    let match;
    let count = 0;

    while ((match = productRegex.exec(html)) !== null && count < 10) {
      const asin = match[1];
      if (!asin || asin === '') continue;

      const productHtml = match[2];
      
      // Extrair título
      const titleMatch = productHtml.match(/<h2[^>]*>[\s\S]*?<span[^>]*class="a-text-normal"[^>]*>([^<]+)<\/span>/i);
      const title = titleMatch ? titleMatch[1].trim() : '';

      // Extrair imagem
      const imgMatch = productHtml.match(/<img[^>]*src="([^"]+)"[^>]*class="s-image"/i);
      const image = imgMatch ? imgMatch[1] : '';

      // Extrair preço
      let price = 0;
      let priceDisplay = '';
      const priceMatch = productHtml.match(/<span[^>]*class="a-price[^"]*"[^>]*>[\s\S]*?<span[^>]*class="a-offscreen"[^>]*>R\$\s*([\d.,]+)<\/span>/i);
      if (priceMatch) {
        priceDisplay = priceMatch[1];
        price = parseFloat(priceDisplay.replace(/\./g, '').replace(',', '.'));
      }

      // Extrair rating
      let rating = 0;
      const ratingMatch = productHtml.match(/aria-label="([\d.,]+)[^"]*de 5 estrelas/i);
      if (ratingMatch) {
        rating = parseFloat(ratingMatch[1].replace(',', '.'));
      }

      // Extrair número de avaliações
      let reviewCount = 0;
      const reviewMatch = productHtml.match(/([\d.,]+)\s*avaliações?/i);
      if (reviewMatch) {
        reviewCount = parseInt(reviewMatch[1].replace(/\./g, '').replace(',', ''));
      }

      // Construir URL do produto
      const productUrl = `https://www.amazon.com.br/dp/${asin}`;

      products.push({
        asin,
        title,
        image,
        price,
        priceDisplay: priceDisplay ? `R$ ${priceDisplay}` : '',
        currency: 'BRL',
        rating,
        reviewCount,
        url: productUrl,
        externalUrl: productUrl,
      });

      count++;
    }

    sendSuccess(res, {
      products,
      totalResults: products.length,
      searchIndex: 'All',
    }, 'Amazon products retrieved successfully');
  } catch (error: any) {
    console.error('Search Amazon products error:', error);
    sendError(res, `Error searching Amazon products: ${error.message}`, 500, error.message);
  }
};
