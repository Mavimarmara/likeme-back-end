import prisma from '@/config/database';
import type { Advertiser, Ad, Product } from '@prisma/client';
import type { ProductImportRepository } from './ProductImportRepository';

export class PrismaProductImportRepository implements ProductImportRepository {
  async findAdvertiserByUserId(userId: string): Promise<Advertiser | null> {
    return prisma.advertiser.findFirst({
      where: {
        userId: userId,
        deletedAt: null,
      },
    });
  }

  async createAdvertiser(userId: string, name: string): Promise<Advertiser> {
    return prisma.advertiser.create({
      data: {
        userId: userId,
        name: name,
        status: 'active',
      },
    });
  }

  async createAd(data: {
    advertiserId: string;
    productId: string;
    status: string;
    targetAudience: string | null;
    startDate: Date;
    endDate: Date | null;
  }): Promise<Ad> {
    return prisma.ad.create({
      data: {
        advertiserId: data.advertiserId,
        productId: data.productId,
        status: data.status,
        targetAudience: data.targetAudience,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });
  }

  async findByNameAndBrand(name: string, brand: string | null, userId: string): Promise<Product | null> {
    const whereCondition: any = {
      name: {
        equals: name,
        mode: 'insensitive', // Case-insensitive
      },
      sellerId: userId,
      deletedAt: null,
    };

    // Se brand for fornecido, adicionar ao filtro
    if (brand) {
      whereCondition.brand = {
        equals: brand,
        mode: 'insensitive',
      };
    }

    return prisma.product.findFirst({
      where: whereCondition,
    });
  }
}

