import prisma from '@/config/database';
import type { Product, Prisma } from '@prisma/client';
import { extractAmazonProductData } from '@/utils/amazonScraper';
import type {
  ProductQueryFilters,
  UpdateStockOperation,
} from '@/interfaces/product/product';
import { recipientService } from '@/services/payment/recipientService';
import { getProductRepository } from '@/utils/repositoryContainer';
import type { ProductRepository } from '@/repositories';

export class ProductService {
  private productRepository: ProductRepository;

  constructor(productRepository?: ProductRepository) {
    this.productRepository = productRepository || getProductRepository();
  }
  async findById(id: string): Promise<any | null> {
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

    // Se o produto tem externalUrl, enriquecer com dados do link externo
    // Se não conseguir, retornar null (produto não disponível)
    if (product.externalUrl) {
      const enriched = await this.enrichProductWithExternalData(product);
      return enriched;
    }

    return product;
  }

  private buildWhereClause(filters: ProductQueryFilters): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
    };

    // Se há busca junto com outros filtros, usar AND para combinar tudo
    if (filters.search && filters.search.trim()) {
      const searchConditions: Prisma.ProductWhereInput[] = [
        { name: { contains: filters.search.trim(), mode: 'insensitive' as const } },
        { description: { contains: filters.search.trim(), mode: 'insensitive' as const } },
        { sku: { contains: filters.search.trim(), mode: 'insensitive' as const } },
      ];

      const andConditions: Prisma.ProductWhereInput[] = [
        { deletedAt: null },
        { OR: searchConditions },
      ];

      if (filters.category) {
        andConditions.push({ category: filters.category });
      }

      if (filters.status) {
        andConditions.push({ status: filters.status });
      }

      return { AND: andConditions };
    }

    // Se não há busca, usar condições diretas
    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    return where;
  }

  async findAll(
    page: number,
    limit: number,
    filters: ProductQueryFilters
  ): Promise<{ products: any[]; total: number }> {
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

    // Enriquecer produtos com externalUrl com dados do link externo
    // Filtrar produtos que não conseguiram ser enriquecidos (retornam null)
    const enrichedProductsResults = await Promise.allSettled(
      products.map(async (product: any) => {
        if (product.externalUrl) {
          return await this.enrichProductWithExternalData(product);
        }
        return product;
      })
    );

    const enrichedProducts = enrichedProductsResults
      .filter((result: PromiseSettledResult<any>): result is PromiseFulfilledResult<any> => {
        if (result.status === 'rejected') {
          return false;
        }
        // Filtrar produtos que retornaram null (não conseguiram ser enriquecidos)
        return result.value !== null;
      })
      .map((result: PromiseFulfilledResult<any>) => result.value);

    // Nota: O total reflete a contagem no banco. Alguns produtos podem ser filtrados
    // após o enriquecimento (se não conseguirem buscar dados da Amazon), então
    // o número de produtos retornados pode ser menor que o total, mas isso é esperado
    // e aceitável, pois esses produtos não deveriam ser exibidos mesmo.
    return { products: enrichedProducts, total };
  }

  async create(productData: any, sellerId?: string): Promise<Product> {
    if (productData.sku) {
      const existingProduct = await prisma.product.findUnique({
        where: { sku: productData.sku },
      });

      if (existingProduct) {
        throw new Error('SKU already in use');
      }
    }

    if (sellerId) {
      try {
        const advertiser = await prisma.advertiser.findUnique({
          where: { userId: sellerId },
        });

        if (advertiser) {
          await recipientService.ensureAdvertiserHasRecipient(advertiser.id);
        } else {
          console.warn('[ProductService] Usuário não é um advertiser, recipient não será criado');
        }
      } catch (error: any) {
        console.warn('[ProductService] Erro ao garantir recipient para advertiser:', error.message);
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
        sellerId: sellerId || null,
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

  private isAmazonUrl(url: string | null | undefined): boolean {
    return !!(url && url.includes('amazon.'));
  }

  private async enrichProductWithExternalData(
    product: Product
  ): Promise<any | null> {
    if (!product.externalUrl) {
      return product;
    }

    if (!this.isAmazonUrl(product.externalUrl)) {
      return product;
    }

    try {
      // Timeout de 5 segundos para buscar dados da Amazon
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout fetching Amazon data')), 5000);
      });

      const amazonData = await Promise.race([
        extractAmazonProductData(product.externalUrl),
        timeoutPromise,
      ]);
      
      if (!amazonData) {
        console.warn(`No data retrieved for product ${product.id} from ${product.externalUrl}`);
        return null;
      }

      // Verificar se o título é válido (não é o fallback "Produto Amazon")
      if (amazonData.title === 'Produto Amazon' || !amazonData.title || amazonData.title.trim() === '') {
        console.warn(`Invalid title retrieved for product ${product.id} from ${product.externalUrl}`);
        return null;
      }

      // Mesclar dados do Amazon com o produto, priorizando dados do Amazon
      return {
        ...product,
        name: amazonData.title,
        description: amazonData.description || product.description || '',
        price: amazonData.price ? parseFloat(amazonData.price.toString()) : product.price,
        image: amazonData.image || product.image || '',
        brand: amazonData.brand || product.brand,
        images: amazonData.images,
        rating: amazonData.rating,
        reviewCount: amazonData.reviewCount,
        asin: amazonData.asin,
        priceDisplay: amazonData.priceDisplay,
        currency: amazonData.currency,
        availability: amazonData.availability,
      };
    } catch (error: any) {
      console.error(`Error fetching external product data for ${product.id}:`, error.message || error);
      // Se falhar ao buscar dados externos, retornar null para não incluir na listagem
      return null;
    }
  }
}

export const productService = new ProductService();
