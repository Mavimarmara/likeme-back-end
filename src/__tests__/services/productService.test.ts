import { productService } from '@/services/productService';
import prisma from '@/config/database';
import { safeTestCleanup, TestDataTracker } from '@/utils/test-helpers';

jest.setTimeout(30000);

const testDataTracker = new TestDataTracker();

afterAll(async () => {
  await safeTestCleanup(testDataTracker, prisma);
  await prisma.$disconnect();
});

describe('ProductService', () => {
  let testProduct: any;

  beforeEach(async () => {
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
