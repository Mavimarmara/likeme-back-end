import { adService } from '@/services/adService';
import prisma from '@/config/database';
import { extractAmazonProductData } from '@/utils/amazonScraper';
import { safeTestCleanup, TestDataTracker } from '@/utils/test-helpers';

jest.mock('@/utils/amazonScraper');

jest.setTimeout(30000);

const testDataTracker = new TestDataTracker();

afterAll(async () => {
  await safeTestCleanup(testDataTracker, prisma);
  await prisma.$disconnect();
});

describe('AdService', () => {
  let testAdvertiser: any;
  let testProduct: any;
  let testAd: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const person = await prisma.person.create({
      data: { firstName: 'Test', lastName: 'Advertiser' },
    });
    testDataTracker.add('person', person.id);

    const user = await prisma.user.create({
      data: {
        personId: person.id,
        username: `test${Date.now()}@example.com`,
        password: 'hashed',
        isActive: true,
      },
    });
    testDataTracker.add('user', user.id);

    testAdvertiser = await prisma.advertiser.create({
      data: { userId: user.id, name: 'Test Advertiser' },
    });
    testDataTracker.add('advertiser', testAdvertiser.id);

    testProduct = await prisma.product.create({
      data: {
        name: 'Test Product',
        description: 'Test',
        price: 100,
        quantity: 10,
        status: 'active',
      },
    });
    testDataTracker.add('product', testProduct.id);

    testAd = await prisma.ad.create({
      data: {
        advertiserId: testAdvertiser.id,
        productId: testProduct.id,
        status: 'active',
      },
    });
    testDataTracker.add('ad', testAd.id);
  });

  describe('create', () => {
    it('should create ad with existing product', async () => {
      const adData = {
        advertiserId: testAdvertiser.id,
        productId: testProduct.id,
        status: 'active' as const,
      };

      const ad = await adService.create(adData);

      expect(ad).toBeDefined();
      expect(ad.productId).toBe(testProduct.id);
      expect(ad.advertiserId).toBe(testAdvertiser.id);

      if (ad.id) {
        testDataTracker.add('ad', ad.id);
      }
    });

    it('should create ad with new product', async () => {
      const adData = {
        advertiserId: testAdvertiser.id,
        product: {
          name: 'New Product',
          description: 'New Description',
          price: 50,
          quantity: 5,
          status: 'active' as const,
        },
        status: 'active' as const,
      };

      const ad = await adService.create(adData);

      expect(ad).toBeDefined();
      expect(ad.product).toBeDefined();
      expect(ad.product?.name).toBe('New Product');

      if (ad.id) {
        testDataTracker.add('ad', ad.id);
      }
      if (ad.product?.id) {
        testDataTracker.add('product', ad.product.id);
      }
    });

    it('should throw error when advertiser not found', async () => {
      const adData = {
        advertiserId: 'non-existent-id',
        productId: testProduct.id,
      };

      await expect(adService.create(adData)).rejects.toThrow('Advertiser not found');
    });

    it('should throw error when product not found', async () => {
      const adData = {
        advertiserId: testAdvertiser.id,
        productId: 'non-existent-id',
      };

      await expect(adService.create(adData)).rejects.toThrow('Product not found');
    });

    it('should throw error when product data is missing', async () => {
      const adData = {
        advertiserId: testAdvertiser.id,
      };

      await expect(adService.create(adData)).rejects.toThrow('Product data is required');
    });
  });

  describe('findById', () => {
    it('should find ad by id', async () => {
      const ad = await adService.findById(testAd.id);

      expect(ad).toBeDefined();
      expect(ad?.id).toBe(testAd.id);
    });

    it('should return null for non-existent ad', async () => {
      const ad = await adService.findById('non-existent-id');

      expect(ad).toBeNull();
    });
  });

  describe('findByIdWithAmazonData', () => {
    it('should enrich product with Amazon data when externalUrl exists', async () => {
      const amazonProduct = await prisma.product.create({
        data: {
          name: 'Amazon Product',
          externalUrl: 'https://www.amazon.com.br/dp/B0BLJTJ38M',
          status: 'active',
        },
      });
      testDataTracker.add('product', amazonProduct.id);

      const amazonAd = await prisma.ad.create({
        data: {
          advertiserId: testAdvertiser.id,
          productId: amazonProduct.id,
          status: 'active',
        },
      });
      testDataTracker.add('ad', amazonAd.id);

      const mockAmazonData = {
        title: 'Amazon Product Title',
        description: 'Amazon Description',
        price: 199.99,
        image: 'https://example.com/image.jpg',
      };

      (extractAmazonProductData as jest.Mock).mockResolvedValue(mockAmazonData);

      const ad = await adService.findByIdWithAmazonData(amazonAd.id);

      expect(ad).toBeDefined();
      expect(ad?.product?.name).toBe('Amazon Product Title');
      expect(ad?.product?.price).toBe(199.99);
    });

    it('should return ad without Amazon data when externalUrl does not exist', async () => {
      const ad = await adService.findByIdWithAmazonData(testAd.id);

      expect(ad).toBeDefined();
      expect(ad?.product?.name).toBe('Test Product');
      expect(extractAmazonProductData).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should find all ads with filters', async () => {
      const result = await adService.findAll(1, 10, {
        status: 'active',
      });

      expect(result.ads).toBeDefined();
      expect(Array.isArray(result.ads)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter by advertiserId', async () => {
      const result = await adService.findAll(1, 10, {
        advertiserId: testAdvertiser.id,
      });

      expect(result.ads.length).toBeGreaterThan(0);
      result.ads.forEach((ad) => {
        expect(ad.advertiserId).toBe(testAdvertiser.id);
      });
    });

    it('should filter by category', async () => {
      const result = await adService.findAll(1, 10, {
        category: 'physical product',
      });

      expect(result.ads).toBeDefined();
      expect(Array.isArray(result.ads)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update ad', async () => {
      const updateData = {
        status: 'inactive' as const,
      };

      const updatedAd = await adService.update(testAd.id, updateData);

      expect(updatedAd.status).toBe('inactive');
    });

    it('should throw error when ad not found', async () => {
      await expect(
        adService.update('non-existent-id', { status: 'active' })
      ).rejects.toThrow('Ad not found');
    });
  });

  describe('delete', () => {
    it('should soft delete ad', async () => {
      await adService.delete(testAd.id);

      const deletedAd = await prisma.ad.findUnique({
        where: { id: testAd.id },
      });

      expect(deletedAd?.deletedAt).toBeDefined();
    });

    it('should throw error when ad not found', async () => {
      await expect(adService.delete('non-existent-id')).rejects.toThrow('Ad not found');
    });
  });
});
