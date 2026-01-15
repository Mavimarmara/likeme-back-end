import type { Advertiser, Ad } from '@prisma/client';

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
}

