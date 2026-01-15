import prisma from '@/config/database';
import type {
  ProductRepository,
  CreateProductData,
  ProductData,
  UpdateProductData,
  ProductFilters,
} from './ProductRepository';

export class PrismaProductRepository implements ProductRepository {
  async save(data: CreateProductData): Promise<{ id: string }> {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        quantity: data.stock,
        category: data.category,
        image: data.imageUrl,
        status: data.isActive ? 'active' : 'inactive',
      },
      select: { id: true },
    });

    return { id: product.id };
  }

  async findById(id: string): Promise<ProductData | null> {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    return product ? this.mapToProductData(product) : null;
  }

  async findAll(filters?: ProductFilters): Promise<ProductData[]> {
    const where: any = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return products.map((product) => this.mapToProductData(product));
  }

  async findByCategory(category: string): Promise<ProductData[]> {
    const products = await prisma.product.findMany({
      where: {
        category,
        status: 'active',
      },
      orderBy: { name: 'asc' },
    });

    return products.map((product) => this.mapToProductData(product));
  }

  async update(id: string, data: UpdateProductData): Promise<void> {
    await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        quantity: data.stock,
        category: data.category,
        image: data.imageUrl,
        status: data.isActive !== undefined ? (data.isActive ? 'active' : 'inactive') : undefined,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.product.delete({
      where: { id },
    });
  }

  async updateStock(id: string, quantity: number): Promise<void> {
    await prisma.product.update({
      where: { id },
      data: {
        quantity: {
          decrement: quantity,
        },
      },
    });
  }

  async checkStock(id: string, quantity: number): Promise<boolean> {
    const product = await prisma.product.findUnique({
      where: { id },
      select: { quantity: true },
    });

    return product ? (product.quantity ?? 0) >= quantity : false;
  }

  private mapToProductData(product: any): ProductData {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price ? Number(product.price) : 0,
      stock: product.quantity ?? 0,
      category: product.category,
      imageUrl: product.image,
      isActive: product.status === 'active',
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}

