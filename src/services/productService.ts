import prisma from '@/config/database';
import type { Product, Prisma } from '@prisma/client';

export interface ProductQueryFilters {
  category?: string;
  status?: string;
  search?: string;
}

export interface UpdateStockOperation {
  quantity: number;
  operation: 'add' | 'subtract' | 'set';
}

export class ProductService {
  async findById(id: string): Promise<Product | null> {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        orderItems: {
          where: { deletedAt: null },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        ads: {
          where: { deletedAt: null },
          include: {
            advertiser: true,
          },
        },
      },
    });

    if (!product || product.deletedAt) {
      return null;
    }

    return product;
  }

  private buildWhereClause(filters: ProductQueryFilters): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
    };

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async findAll(
    page: number,
    limit: number,
    filters: ProductQueryFilters
  ): Promise<{ products: Product[]; total: number }> {
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(filters);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return { products, total };
  }

  async create(productData: any): Promise<Product> {
    if (productData.sku) {
      const existingProduct = await prisma.product.findUnique({
        where: { sku: productData.sku },
      });

      if (existingProduct) {
        throw new Error('SKU already in use');
      }
    }

    return prisma.product.create({
      data: {
        name: productData.name,
        description: productData.description,
        sku: productData.sku,
        price: productData.price,
        cost: productData.cost,
        quantity: productData.quantity ?? null,
        image: productData.image,
        category: productData.category,
        brand: productData.brand,
        status: productData.status || 'active',
        weight: productData.weight,
        dimensions: productData.dimensions,
        externalUrl: productData.externalUrl,
      },
    });
  }

  async update(id: string, updateData: any): Promise<Product> {
    const existingProduct = await this.findById(id);
    
    if (!existingProduct) {
      throw new Error('Product not found');
    }

    if (updateData.sku && updateData.sku !== existingProduct.sku) {
      const skuExists = await prisma.product.findUnique({
        where: { sku: updateData.sku },
      });

      if (skuExists) {
        throw new Error('SKU already in use');
      }
    }

    if (updateData.quantity !== undefined) {
      updateData.status = this.calculateStatusFromQuantity(
        updateData.quantity,
        existingProduct.status
      );
    }

    return prisma.product.update({
      where: { id },
      data: updateData,
    });
  }

  private calculateStatusFromQuantity(
    quantity: number | null,
    currentStatus: string
  ): string {
    if (quantity === null || quantity <= 0) {
      return 'out_of_stock';
    }

    if (currentStatus === 'out_of_stock' && quantity > 0) {
      return 'active';
    }

    return currentStatus;
  }

  async delete(id: string): Promise<void> {
    const product = await this.findById(id);
    
    if (!product) {
      throw new Error('Product not found');
    }

    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async updateStock(id: string, operation: UpdateStockOperation): Promise<Product> {
    const product = await this.findById(id);
    
    if (!product) {
      throw new Error('Product not found');
    }

    if (product.externalUrl) {
      throw new Error('Cannot update stock for products with external URL');
    }

    const newQuantity = this.calculateNewQuantity(
      product.quantity ?? 0,
      operation
    );

    const updateData: any = {
      quantity: newQuantity,
      status: this.calculateStatusFromQuantity(newQuantity, product.status),
    };

    return prisma.product.update({
      where: { id },
      data: updateData,
    });
  }

  private calculateNewQuantity(
    currentQuantity: number,
    operation: UpdateStockOperation
  ): number {
    if (operation.operation === 'add') {
      return currentQuantity + operation.quantity;
    }

    if (operation.operation === 'subtract') {
      return Math.max(0, currentQuantity - operation.quantity);
    }

    return operation.quantity;
  }
}

export const productService = new ProductService();
