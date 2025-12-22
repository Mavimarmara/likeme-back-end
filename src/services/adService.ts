import prisma from '@/config/database';
import { extractAmazonProductData } from '@/utils/amazonScraper';
import type { Ad, Product, Prisma } from '@prisma/client';

export interface AdWithRelations extends Ad {
  advertiser?: any;
  product?: Product | null;
}

export interface ProductDataFromAmazon {
  title?: string;
  description?: string;
  price?: number;
  image?: string;
  brand?: string;
  images?: string[];
  rating?: number;
  reviewCount?: number;
  asin?: string | null;
  priceDisplay?: string;
  currency?: string;
  url?: string;
  availability?: string;
}

export interface AdQueryFilters {
  advertiserId?: string;
  productId?: string;
  status?: string;
  category?: string;
  activeOnly?: boolean;
}

export class AdService {
  private async validateAdvertiser(advertiserId: string | undefined): Promise<void> {
    if (!advertiserId) {
      return;
    }

    const advertiser = await prisma.advertiser.findUnique({
      where: { id: advertiserId },
    });

    if (!advertiser || advertiser.deletedAt) {
      throw new Error('Advertiser not found');
    }
  }

  private async validateProduct(productId: string): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.deletedAt) {
      throw new Error('Product not found');
    }
  }

  private async createProductFromData(productData: any): Promise<string> {
    const product = await prisma.product.create({
      data: {
        name: productData.name || '',
        description: productData.description,
        image: productData.image,
        price: productData.price ?? null,
        quantity: productData.quantity ?? null,
        category: productData.category,
        externalUrl: productData.externalUrl,
        status: productData.status || 'active',
      },
    });

    return product.id;
  }

  private async resolveProductId(adData: any): Promise<string> {
    if (adData.productId) {
      await this.validateProduct(adData.productId);
      return adData.productId;
    }

    if (!adData.product) {
      throw new Error('Product data is required when productId is not provided');
    }

    return this.createProductFromData(adData.product);
  }

  async create(adData: any): Promise<AdWithRelations> {
    await this.validateAdvertiser(adData.advertiserId);
    const productId = await this.resolveProductId(adData);

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

    return ad as AdWithRelations;
  }

  private buildWhereClause(filters: AdQueryFilters): Prisma.AdWhereInput {
    const where: Prisma.AdWhereInput = {
      deletedAt: null,
    };

    if (filters.advertiserId) {
      where.advertiserId = filters.advertiserId;
    }

    if (filters.productId) {
      where.productId = filters.productId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.category) {
      where.product = {
        category: filters.category,
      };
    }

    if (!filters.activeOnly) {
      return where;
    }

    const now = new Date();
    
    if (!where.status) {
      where.status = 'active';
    }
    
    const existingAnd: Prisma.AdWhereInput[] = [];
    if (where.AND) {
      if (Array.isArray(where.AND)) {
        existingAnd.push(...where.AND);
      } else {
        existingAnd.push(where.AND);
      }
    }

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

    return where;
  }

  async findAll(
    page: number,
    limit: number,
    filters: AdQueryFilters
  ): Promise<{ ads: AdWithRelations[]; total: number }> {
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(filters);

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

    // Enriquecer ads com dados da Amazon e filtrar os que não conseguiram ser enriquecidos
    const enrichedAds = await this.enrichAdsWithAmazonData(ads as AdWithRelations[]);
    
    // Filtrar ads cujo produto seja null (não conseguiu ser enriquecido)
    const validAds = enrichedAds.filter(ad => ad.product !== null);

    return { ads: validAds, total: validAds.length };
  }

  async findById(id: string): Promise<AdWithRelations | null> {
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
      return null;
    }

    return ad as AdWithRelations;
  }

  private isAmazonUrl(url: string | null | undefined): boolean {
    return !!(url && url.includes('amazon.'));
  }

  private async enrichProductWithAmazonData(
    product: Product | null | undefined,
    externalUrl: string,
    timeoutMs: number = 5000
  ): Promise<ProductDataFromAmazon | null> {
    if (!this.isAmazonUrl(externalUrl)) {
      return null;
    }

    try {
      // Timeout configurável para buscar dados da Amazon (padrão 5s para listagens, maior para detalhes)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout fetching Amazon data')), timeoutMs);
      });

      const amazonData = await Promise.race([
        extractAmazonProductData(externalUrl),
        timeoutPromise,
      ]);

      // Verificar se o título é válido (não é o fallback "Produto Amazon")
      if (!amazonData || amazonData.title === 'Produto Amazon' || !amazonData.title || amazonData.title.trim() === '') {
        console.warn(`Invalid title retrieved for product from ${externalUrl}`);
        return null;
      }

      return amazonData;
    } catch (error: any) {
      console.error('Error fetching external product data:', error);
      return null;
    }
  }

  private mergeAmazonDataWithProduct(
    product: Product | null | undefined,
    amazonData: ProductDataFromAmazon | null
  ): any | null {
    if (!product) {
      return null;
    }

    // Se não conseguiu buscar dados da Amazon e o produto tem externalUrl Amazon, retornar null
    if (!amazonData && product.externalUrl && this.isAmazonUrl(product.externalUrl)) {
      return null;
    }

    if (!amazonData) {
      return product;
    }

    return {
      ...product,
      name: amazonData.title || product.name || '',
      description: amazonData.description || product.description || '',
      price: amazonData.price ? parseFloat(amazonData.price.toString()) : product.price,
      image: amazonData.image || product.image || '',
      brand: amazonData.brand || product.brand,
      images: amazonData.images,
      rating: amazonData.rating,
      reviewCount: amazonData.reviewCount,
      asin: amazonData.asin,
    };
  }

  async findByIdWithAmazonData(id: string): Promise<AdWithRelations | null> {
    const ad = await this.findById(id);
    
    if (!ad) {
      return null;
    }

    if (!this.isAmazonUrl(ad.product?.externalUrl)) {
      return ad;
    }

    const amazonData = await this.enrichProductWithAmazonData(
      ad.product,
      ad.product!.externalUrl!
    );

    const mergedProduct = this.mergeAmazonDataWithProduct(ad.product, amazonData);
    
    // Se o produto não conseguiu ser enriquecido, retornar null (ad não disponível)
    if (!mergedProduct) {
      return null;
    }

    return {
      ...ad,
      product: mergedProduct,
    };
  }

  async enrichAdsWithAmazonData(ads: AdWithRelations[]): Promise<AdWithRelations[]> {
    const enrichedResults = await Promise.allSettled(
      ads.map(async (ad) => {
        if (!this.isAmazonUrl(ad.product?.externalUrl)) {
          return ad;
        }

        const amazonData = await this.enrichProductWithAmazonData(
          ad.product,
          ad.product!.externalUrl!
        );

        const mergedProduct = this.mergeAmazonDataWithProduct(ad.product, amazonData);
        
        // Se o produto não conseguiu ser enriquecido, retornar ad com product null
        if (!mergedProduct) {
          return {
            ...ad,
            product: null,
          };
        }

        return {
          ...ad,
          product: mergedProduct,
        };
      })
    );

    // Retornar apenas os ads que foram processados com sucesso
    return enrichedResults
      .filter((result): result is PromiseFulfilledResult<AdWithRelations> => result.status === 'fulfilled')
      .map(result => result.value);
  }

  async update(id: string, updateData: any): Promise<AdWithRelations> {
    const ad = await this.findById(id);
    
    if (!ad) {
      throw new Error('Ad not found');
    }

    if (updateData.advertiserId !== undefined && updateData.advertiserId !== ad.advertiserId) {
      await this.validateAdvertiser(updateData.advertiserId);
    }

    if (updateData.productId !== undefined && updateData.productId !== ad.productId) {
      if (updateData.productId) {
        await this.validateProduct(updateData.productId);
      }
    }

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

    return updatedAd as AdWithRelations;
  }

  async delete(id: string): Promise<void> {
    const ad = await this.findById(id);
    
    if (!ad) {
      throw new Error('Ad not found');
    }

    await prisma.ad.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const adService = new AdService();
