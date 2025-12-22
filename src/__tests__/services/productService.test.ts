import { productService } from '@/services/productService';
import prisma from '@/config/database';
import { safeTestCleanup, TestDataTracker } from '@/utils/test-helpers';
import { extractAmazonProductData } from '@/utils/amazonScraper';

jest.mock('@/utils/amazonScraper');

jest.setTimeout(30000);

const testDataTracker = new TestDataTracker();

afterAll(async () => {
  await safeTestCleanup(testDataTracker, prisma);
  await prisma.$disconnect();
});

describe('ProductService', () => {
  let testProduct: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    testProduct = await prisma.product.create({
      data: {
        name: 'Test Product',
        description: 'Test Description',
        price: 100,
        quantity: 10,
        status: 'active',
      },
    });
    testDataTracker.add('product', testProduct.id);
  });

  describe('create', () => {
    it('should create product', async () => {
      const productData = {
        name: 'New Product',
        description: 'New Description',
        price: 50,
        quantity: 5,
        status: 'active' as const,
      };

      const product = await productService.create(productData);

      expect(product).toBeDefined();
      expect(product.name).toBe('New Product');
      expect(product.price?.toString()).toBe('50');

      testDataTracker.add('product', product.id);
    });

    it('should throw error when SKU already in use', async () => {
      const sku = `TEST-SKU-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const firstProduct = await prisma.product.create({
        data: {
          name: 'First Product',
          sku,
          price: 10,
          status: 'active',
        },
      });
      testDataTracker.add('product', firstProduct.id);

      const productData = {
        name: 'Second Product',
        sku,
        price: 20,
        status: 'active' as const,
      };

      await expect(productService.create(productData)).rejects.toThrow('SKU already in use');
    });

    it('should create product with nullable price and quantity', async () => {
      const productData = {
        name: 'External Product',
        description: 'External Description',
        externalUrl: 'https://example.com/product',
        status: 'active' as const,
      };

      const product = await productService.create(productData);

      expect(product).toBeDefined();
      expect(product.price).toBeNull();
      expect(product.quantity).toBeNull();
      expect(product.externalUrl).toBe('https://example.com/product');

      testDataTracker.add('product', product.id);
    });
  });

  describe('findById', () => {
    it('should find product by id', async () => {
      const product = await productService.findById(testProduct.id);

      expect(product).toBeDefined();
      expect(product?.id).toBe(testProduct.id);
      expect(product?.name).toBe('Test Product');
    });

    it('should return null for non-existent product', async () => {
      const product = await productService.findById('non-existent-id');

      expect(product).toBeNull();
    });

    it('should enrich product with Amazon data when externalUrl is present', async () => {
      const amazonUrl = 'https://www.amazon.com.br/dp/B08XYZ1234';
      const mockAmazonData = {
        asin: 'B08XYZ1234',
        title: 'Amazon Product Title',
        description: 'Amazon Product Description',
        price: 99.99,
        priceDisplay: 'R$ 99,99',
        currency: 'BRL',
        images: ['https://amazon.com/image1.jpg'],
        image: 'https://amazon.com/image1.jpg',
        rating: 4.5,
        reviewCount: 1234,
        brand: 'Amazon Brand',
        url: amazonUrl,
        availability: 'Available',
      };

      (extractAmazonProductData as jest.Mock).mockResolvedValue(mockAmazonData);

      const externalProduct = await prisma.product.create({
        data: {
          name: 'Original Product Name',
          description: 'Original Description',
          price: 50,
          externalUrl: amazonUrl,
          status: 'active',
        },
      });
      testDataTracker.add('product', externalProduct.id);

      const enrichedProduct = await productService.findById(externalProduct.id);

      expect(enrichedProduct).toBeDefined();
      expect(enrichedProduct?.name).toBe(mockAmazonData.title);
      expect(enrichedProduct?.description).toBe(mockAmazonData.description);
      expect(enrichedProduct?.price).toBe(mockAmazonData.price);
      expect(enrichedProduct?.image).toBe(mockAmazonData.image);
      expect(enrichedProduct?.asin).toBe(mockAmazonData.asin);
      expect(enrichedProduct?.rating).toBe(mockAmazonData.rating);
      expect(enrichedProduct?.reviewCount).toBe(mockAmazonData.reviewCount);
      expect(extractAmazonProductData).toHaveBeenCalledWith(amazonUrl);
    });

    it('should return null if Amazon scraping fails', async () => {
      const amazonUrl = 'https://www.amazon.com.br/dp/B08XYZ1234';

      (extractAmazonProductData as jest.Mock).mockRejectedValue(new Error('Scraping failed'));

      const externalProduct = await prisma.product.create({
        data: {
          name: 'Original Product Name',
          description: 'Original Description',
          price: 50,
          externalUrl: amazonUrl,
          status: 'active',
        },
      });
      testDataTracker.add('product', externalProduct.id);

      const product = await productService.findById(externalProduct.id);

      // Produto com externalUrl que falhou no scraping não deve ser retornado
      expect(product).toBeNull();
    });

    it('should not enrich product if externalUrl is not Amazon', async () => {
      const nonAmazonUrl = 'https://example.com/product';

      const externalProduct = await prisma.product.create({
        data: {
          name: 'Original Product Name',
          description: 'Original Description',
          price: 50,
          externalUrl: nonAmazonUrl,
          status: 'active',
        },
      });
      testDataTracker.add('product', externalProduct.id);

      const product = await productService.findById(externalProduct.id);

      expect(product).toBeDefined();
      expect(product?.name).toBe('Original Product Name');
      expect(extractAmazonProductData).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should find all products', async () => {
      const result = await productService.findAll(1, 10, {});

      expect(result.products).toBeDefined();
      expect(Array.isArray(result.products)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter by category', async () => {
      await prisma.product.create({
        data: {
          name: 'Category Product',
          category: 'physical product',
          price: 20,
          status: 'active',
        },
      });

      const result = await productService.findAll(1, 10, {
        category: 'physical product',
      });

      expect(result.products.length).toBeGreaterThan(0);
      result.products.forEach((product) => {
        expect(product.category).toBe('physical product');
      });
    });

    it('should search products', async () => {
      const result = await productService.findAll(1, 10, {
        search: 'Test',
      });

      expect(result.products.length).toBeGreaterThan(0);
    });

    it('should enrich products with Amazon data when externalUrl is present', async () => {
      const amazonUrl = 'https://www.amazon.com.br/dp/B08XYZ5678';
      const mockAmazonData = {
        asin: 'B08XYZ5678',
        title: 'Amazon Product Title 2',
        description: 'Amazon Product Description 2',
        price: 149.99,
        priceDisplay: 'R$ 149,99',
        currency: 'BRL',
        images: ['https://amazon.com/image2.jpg'],
        image: 'https://amazon.com/image2.jpg',
        rating: 4.8,
        reviewCount: 5678,
        brand: 'Amazon Brand 2',
        url: amazonUrl,
        availability: 'Available',
      };

      (extractAmazonProductData as jest.Mock).mockResolvedValue(mockAmazonData);

      const externalProduct = await prisma.product.create({
        data: {
          name: 'Original Product Name 2',
          description: 'Original Description 2',
          price: 100,
          externalUrl: amazonUrl,
          status: 'active',
        },
      });
      testDataTracker.add('product', externalProduct.id);

      const result = await productService.findAll(1, 10, {});

      const enrichedProduct = result.products.find(p => p.id === externalProduct.id);
      expect(enrichedProduct).toBeDefined();
      if (enrichedProduct) {
        expect(enrichedProduct.name).toBe(mockAmazonData.title);
        expect(enrichedProduct.description).toBe(mockAmazonData.description);
        expect(enrichedProduct.price).toBe(mockAmazonData.price);
        expect(enrichedProduct.asin).toBe(mockAmazonData.asin);
      }
    });

    it('should exclude products from list if Amazon scraping fails', async () => {
      const amazonUrl = 'https://www.amazon.com.br/dp/B08XYZ9999';

      (extractAmazonProductData as jest.Mock).mockRejectedValue(new Error('Scraping failed'));

      const externalProduct = await prisma.product.create({
        data: {
          name: 'Original Product Name 3',
          description: 'Original Description 3',
          price: 100,
          externalUrl: amazonUrl,
          status: 'active',
        },
      });
      testDataTracker.add('product', externalProduct.id);

      const result = await productService.findAll(1, 10, {});

      // Produto que falhou no scraping não deve aparecer na listagem
      const failedProduct = result.products.find(p => p.id === externalProduct.id);
      expect(failedProduct).toBeUndefined();
    });

    it('should exclude products with invalid title (Produto Amazon fallback)', async () => {
      const amazonUrl = 'https://www.amazon.com.br/dp/B08XYZ0000';
      const mockAmazonData = {
        asin: 'B08XYZ0000',
        title: 'Produto Amazon', // Título inválido (fallback)
        description: 'Description',
        price: 99.99,
        priceDisplay: 'R$ 99,99',
        currency: 'BRL',
        images: [],
        image: '',
        rating: 0,
        reviewCount: 0,
        brand: '',
        url: amazonUrl,
        availability: 'Available',
      };

      (extractAmazonProductData as jest.Mock).mockResolvedValue(mockAmazonData);

      const externalProduct = await prisma.product.create({
        data: {
          name: 'Original Product Name 4',
          description: 'Original Description 4',
          price: 100,
          externalUrl: amazonUrl,
          status: 'active',
        },
      });
      testDataTracker.add('product', externalProduct.id);

      const result = await productService.findAll(1, 10, {});

      // Produto com título inválido não deve aparecer na listagem
      const invalidProduct = result.products.find(p => p.id === externalProduct.id);
      expect(invalidProduct).toBeUndefined();
    });

    it('should handle mixed products (with and without externalUrl)', async () => {
      const amazonUrl = 'https://www.amazon.com.br/dp/B08XYZ9999';
      const mockAmazonData = {
        asin: 'B08XYZ9999',
        title: 'Amazon Product',
        description: 'Amazon Description',
        price: 79.99,
        priceDisplay: 'R$ 79,99',
        currency: 'BRL',
        images: ['https://amazon.com/image.jpg'],
        image: 'https://amazon.com/image.jpg',
        rating: 4.0,
        reviewCount: 999,
        brand: 'Amazon Brand',
        url: amazonUrl,
        availability: 'Available',
      };

      (extractAmazonProductData as jest.Mock).mockResolvedValue(mockAmazonData);

      const regularProduct = await prisma.product.create({
        data: {
          name: 'Regular Product',
          description: 'Regular Description',
          price: 30,
          status: 'active',
        },
      });
      testDataTracker.add('product', regularProduct.id);

      const externalProduct = await prisma.product.create({
        data: {
          name: 'External Product',
          description: 'External Description',
          price: 50,
          externalUrl: amazonUrl,
          status: 'active',
        },
      });
      testDataTracker.add('product', externalProduct.id);

      const result = await productService.findAll(1, 10, {});

      const regular = result.products.find(p => p.id === regularProduct.id);
      const external = result.products.find(p => p.id === externalProduct.id);

      expect(regular).toBeDefined();
      expect(regular?.name).toBe('Regular Product');
      expect(regular?.asin).toBeUndefined();

      expect(external).toBeDefined();
      expect(external?.name).toBe(mockAmazonData.title);
      expect(external?.asin).toBe(mockAmazonData.asin);
    });
  });

  describe('update', () => {
    it('should update product', async () => {
      const updateData = {
        name: 'Updated Product',
        price: 150,
      };

      const updatedProduct = await productService.update(testProduct.id, updateData);

      expect(updatedProduct.name).toBe('Updated Product');
      expect(updatedProduct.price?.toString()).toBe('150');
    });

    it('should update status when quantity changes', async () => {
      const updateData = {
        quantity: 0,
      };

      const updatedProduct = await productService.update(testProduct.id, updateData);

      expect(updatedProduct.status).toBe('out_of_stock');
      expect(updatedProduct.quantity).toBe(0);
    });

    it('should throw error when product not found', async () => {
      await expect(
        productService.update('non-existent-id', { name: 'New Name' })
      ).rejects.toThrow('Product not found');
    });
  });

  describe('updateStock', () => {
    it('should add to stock', async () => {
      const operation = {
        quantity: 5,
        operation: 'add' as const,
      };

      const updatedProduct = await productService.updateStock(testProduct.id, operation);

      expect(updatedProduct.quantity).toBe(15);
    });

    it('should subtract from stock', async () => {
      const operation = {
        quantity: 3,
        operation: 'subtract' as const,
      };

      const updatedProduct = await productService.updateStock(testProduct.id, operation);

      expect(updatedProduct.quantity).toBe(7);
    });

    it('should set stock', async () => {
      const operation = {
        quantity: 25,
        operation: 'set' as const,
      };

      const updatedProduct = await productService.updateStock(testProduct.id, operation);

      expect(updatedProduct.quantity).toBe(25);
    });

    it('should not allow negative stock', async () => {
      const operation = {
        quantity: 100,
        operation: 'subtract' as const,
      };

      const updatedProduct = await productService.updateStock(testProduct.id, operation);

      expect(updatedProduct.quantity).toBe(0);
    });

    it('should throw error for products with externalUrl', async () => {
      const externalProduct = await prisma.product.create({
        data: {
          name: 'External Product',
          externalUrl: 'https://example.com/product',
          status: 'active',
        },
      });
      testDataTracker.add('product', externalProduct.id);

      const operation = {
        quantity: 10,
        operation: 'add' as const,
      };

      await expect(
        productService.updateStock(externalProduct.id, operation)
      ).rejects.toThrow('Cannot update stock for products with external URL');
    });

    it('should throw error when product not found', async () => {
      const operation = {
        quantity: 10,
        operation: 'add' as const,
      };

      await expect(
        productService.updateStock('non-existent-id', operation)
      ).rejects.toThrow('Product not found');
    });
  });

  describe('delete', () => {
    it('should soft delete product', async () => {
      await productService.delete(testProduct.id);

      const deletedProduct = await prisma.product.findUnique({
        where: { id: testProduct.id },
      });

      expect(deletedProduct?.deletedAt).toBeDefined();
    });

    it('should throw error when product not found', async () => {
      await expect(productService.delete('non-existent-id')).rejects.toThrow('Product not found');
    });
  });
});
