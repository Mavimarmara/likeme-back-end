import type { Advertiser, Ad, Product } from '@prisma/client';

export interface ProductImportRepository {
  findAdvertiserByUserId(userId: string): Promise<Advertiser | null>;
  createAdvertiser(userId: string, name: string): Promise<Advertiser>;
  createAd(data: {
    advertiserId: string;
    productId: string;
    status: string;
    targetAudience: string | null;
    startDate: Date;
    endDate: Date | null;
  }): Promise<Ad>;
  findByNameAndBrand(name: string, brand: string | null, userId: string): Promise<Product | null>;
}

