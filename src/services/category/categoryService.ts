import prisma from '@/config/database';

export interface CategoryListItem {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CategoryService {
  async findAll(): Promise<CategoryListItem[]> {
    const categories = await prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return categories;
  }
}

export const categoryService = new CategoryService();
