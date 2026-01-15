import { ProductImportService } from '../productImportService';
import { productService } from '../productService';
import type { ProductImportRepository } from '@/repositories/product/ProductImportRepository';

jest.mock('../productService', () => ({
  productService: {
    create: jest.fn(),
  },
}));

describe('ProductImportService', () => {
  let service: ProductImportService;
  let mockRepository: jest.Mocked<ProductImportRepository>;
  const mockUserId = 'user-123';

  beforeEach(() => {
    mockRepository = {
      findAdvertiserByUserId: jest.fn(),
      createAdvertiser: jest.fn(),
      createAd: jest.fn(),
    };
    service = new ProductImportService(mockRepository);
    jest.clearAllMocks();
  });

  describe('importFromCSV', () => {
    it('should import products from valid CSV', async () => {
      const csvContent = `Provider,Marker,Community,Product Name,Variation,Target Audience,Full Description,Technical Specifications,Stock,Unit Price,Main Image,Secondary Images
Provider A,Tag1,Community A,Product 1,60 Caps,Audience A,Description 1,Spec 1,100,R$ 150.00,https://image.com/1.jpg,`;
      
      const buffer = Buffer.from(csvContent);

      (productService.create as jest.Mock).mockResolvedValue({
        id: 'product-1',
        name: 'Product 1',
        sku: 'product-1-sku',
        price: 150,
        status: 'active',
      });

      mockRepository.findAdvertiserByUserId.mockResolvedValue(null);
      mockRepository.createAdvertiser.mockResolvedValue({
        id: 'advertiser-1',
        userId: mockUserId,
        name: 'Provider A',
        status: 'active',
      } as any);

      mockRepository.createAd.mockResolvedValue({
        id: 'ad-1',
        productId: 'product-1',
        advertiserId: 'advertiser-1',
        status: 'active',
      } as any);

      const result = await service.importFromCSV(buffer, mockUserId);

      expect(result.success).toBe(true);
      expect(result.totalRows).toBe(1);
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);
      expect(result.createdProducts).toHaveLength(1);
      expect(result.createdAds).toHaveLength(1);
    });

    it('should handle CSV with multiple products', async () => {
      const csvContent = `Provider,Marker,Product Name,Stock,Unit Price
Provider A,Tag1,Product 1,100,R$ 150.00
Provider B,Tag2,Product 2,50,R$ 200.00
Provider C,Tag3,Product 3,75,R$ 175.00`;
      
      const buffer = Buffer.from(csvContent);

      (productService.create as jest.Mock)
        .mockResolvedValueOnce({ id: 'product-1', name: 'Product 1', sku: 'sku-1', status: 'active' })
        .mockResolvedValueOnce({ id: 'product-2', name: 'Product 2', sku: 'sku-2', status: 'active' })
        .mockResolvedValueOnce({ id: 'product-3', name: 'Product 3', sku: 'sku-3', status: 'active' });

      mockRepository.findAdvertiserByUserId.mockResolvedValue(null);
      mockRepository.createAdvertiser
        .mockResolvedValueOnce({ id: 'adv-1', userId: mockUserId, name: 'Provider A' } as any)
        .mockResolvedValueOnce({ id: 'adv-2', userId: mockUserId, name: 'Provider B' } as any)
        .mockResolvedValueOnce({ id: 'adv-3', userId: mockUserId, name: 'Provider C' } as any);

      mockRepository.createAd
        .mockResolvedValueOnce({ id: 'ad-1', productId: 'product-1', advertiserId: 'adv-1' } as any)
        .mockResolvedValueOnce({ id: 'ad-2', productId: 'product-2', advertiserId: 'adv-2' } as any)
        .mockResolvedValueOnce({ id: 'ad-3', productId: 'product-3', advertiserId: 'adv-3' } as any);

      const result = await service.importFromCSV(buffer, mockUserId);

      expect(result.success).toBe(true);
      expect(result.totalRows).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.errorCount).toBe(0);
      expect(result.createdProducts).toHaveLength(3);
      expect(result.createdAds).toHaveLength(3);
    });

    it('should skip empty rows and headers', async () => {
      const csvContent = `
Projeto Like:Me
Template Produto
Provider,Product Name,Stock,Unit Price
Provider A,Product 1,100,R$ 150.00

Provider B,Product 2,50,R$ 200.00`;
      
      const buffer = Buffer.from(csvContent);

      (productService.create as jest.Mock)
        .mockResolvedValueOnce({ id: 'product-1', name: 'Product 1', sku: 'sku-1' })
        .mockResolvedValueOnce({ id: 'product-2', name: 'Product 2', sku: 'sku-2' });

      mockRepository.findAdvertiserByUserId.mockResolvedValue({ id: 'adv-1', userId: mockUserId } as any);
      mockRepository.createAd
        .mockResolvedValueOnce({ id: 'ad-1' } as any)
        .mockResolvedValueOnce({ id: 'ad-2' } as any);

      const result = await service.importFromCSV(buffer, mockUserId);

      expect(result.totalRows).toBe(2);
      expect(result.successCount).toBe(2);
    });

    it('should handle errors gracefully', async () => {
      const csvContent = `Provider,Product Name,Stock,Unit Price
Provider A,Product 1,100,R$ 150.00
Provider B,,50,R$ 200.00
Provider C,Product 3,75,R$ 175.00`;
      
      const buffer = Buffer.from(csvContent);

      (productService.create as jest.Mock)
        .mockResolvedValueOnce({ id: 'product-1', name: 'Product 1', sku: 'sku-1' })
        .mockResolvedValueOnce({ id: 'product-3', name: 'Product 3', sku: 'sku-3' });

      mockRepository.findAdvertiserByUserId.mockResolvedValue({ id: 'adv-1' } as any);
      mockRepository.createAd.mockResolvedValue({ id: 'ad-1' } as any);

      const result = await service.importFromCSV(buffer, mockUserId);

      expect(result.success).toBe(false);
      expect(result.totalRows).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Product name is required');
    });

    it('should create products without ads when no provider', async () => {
      const csvContent = `Product Name,Stock,Unit Price
Product 1,100,R$ 150.00
Product 2,50,R$ 200.00`;
      
      const buffer = Buffer.from(csvContent);

      (productService.create as jest.Mock)
        .mockResolvedValueOnce({ id: 'product-1', name: 'Product 1', sku: 'sku-1' })
        .mockResolvedValueOnce({ id: 'product-2', name: 'Product 2', sku: 'sku-2' });

      const result = await service.importFromCSV(buffer, mockUserId);

      expect(result.success).toBe(true);
      expect(result.totalRows).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.createdProducts).toHaveLength(2);
      expect(result.createdAds).toHaveLength(0);
      expect(mockRepository.createAd).not.toHaveBeenCalled();
    });
  });

  describe('parsePrice', () => {
    it('should parse Brazilian format price', () => {
      expect((service as any).parsePrice('R$ 150,00')).toBe(150);
      expect((service as any).parsePrice('R$ 1.500,50')).toBe(1500.5);
    });

    it('should parse American format price', () => {
      expect((service as any).parsePrice('$150.00')).toBe(150);
      expect((service as any).parsePrice('$1,500.50')).toBe(1500.5);
    });

    it('should return 0 for empty price', () => {
      expect((service as any).parsePrice('')).toBe(0);
      expect((service as any).parsePrice('   ')).toBe(0);
    });

    it('should throw error for invalid price', () => {
      expect(() => (service as any).parsePrice('invalid')).toThrow('Invalid price');
    });
  });

  describe('parseQuantity', () => {
    it('should parse valid quantity', () => {
      expect((service as any).parseQuantity('100')).toBe(100);
      expect((service as any).parseQuantity('0')).toBe(0);
    });

    it('should return null for empty quantity', () => {
      expect((service as any).parseQuantity('')).toBeNull();
      expect((service as any).parseQuantity('   ')).toBeNull();
    });

    it('should return null for invalid quantity', () => {
      expect((service as any).parseQuantity('invalid')).toBeNull();
    });
  });

  describe('parseMarkers', () => {
    it('should parse comma-separated markers', () => {
      const result = (service as any).parseMarkers('Tag1, Tag2, Tag3');
      expect(result).toEqual(['Tag1', 'Tag2', 'Tag3']);
    });

    it('should return empty array for empty markers', () => {
      expect((service as any).parseMarkers('')).toEqual([]);
      expect((service as any).parseMarkers('   ')).toEqual([]);
    });

    it('should filter empty markers', () => {
      const result = (service as any).parseMarkers('Tag1, , Tag2');
      expect(result).toEqual(['Tag1', 'Tag2']);
    });
  });

  describe('generateSKU', () => {
    it('should generate SKU from product name', () => {
      const sku = (service as any).generateSKU('Product Name', '');
      expect(sku).toMatch(/^product-name-[a-z0-9]+$/);
    });

    it('should include variation in SKU', () => {
      const sku = (service as any).generateSKU('Product Name', '60 Caps');
      expect(sku).toMatch(/^product-name-60-caps-[a-z0-9]+$/);
    });

    it('should limit SKU length', () => {
      const longName = 'Very Long Product Name That Should Be Truncated';
      const sku = (service as any).generateSKU(longName, 'Variation');
      expect(sku.length).toBeLessThan(50);
    });
  });

  describe('buildDescription', () => {
    it('should build description from all fields', () => {
      const csvRow = {
        fullDescription: 'Main description',
        variation: '60 Caps',
        targetAudience: 'Profile A',
        technicalSpecifications: 'Spec 1, Spec 2',
      } as any;

      const description = (service as any).buildDescription(csvRow);
      
      expect(description).toContain('Main description');
      expect(description).toContain('**Variation:** 60 Caps');
      expect(description).toContain('**Target Audience:** Profile A');
      expect(description).toContain('**Technical Specifications:** Spec 1, Spec 2');
    });

    it('should handle missing fields', () => {
      const csvRow = {
        fullDescription: 'Main description',
        variation: '',
        targetAudience: '',
        technicalSpecifications: '',
      } as any;

      const description = (service as any).buildDescription(csvRow);
      
      expect(description).toBe('Main description');
      expect(description).not.toContain('**Variation:**');
    });

    it('should return empty string when no description', () => {
      const csvRow = {
        fullDescription: '',
        variation: '',
        targetAudience: '',
        technicalSpecifications: '',
      } as any;

      const description = (service as any).buildDescription(csvRow);
      
      expect(description).toBe('');
    });
  });
});
