export interface ProductRepository {
  save(data: CreateProductData): Promise<{ id: string }>;
  findById(id: string): Promise<ProductData | null>;
  findAll(filters?: ProductFilters): Promise<ProductData[]>;
  findByCategory(category: string): Promise<ProductData[]>;
  update(id: string, data: UpdateProductData): Promise<void>;
  delete(id: string): Promise<void>;
  updateStock(id: string, quantity: number): Promise<void>;
  checkStock(id: string, quantity: number): Promise<boolean>;
}

export interface CreateProductData {
  name: string;
  description?: string;
  price: number;
  stock: number;
  category?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export interface ProductData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  category?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export interface ProductFilters {
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  category?: string;
  search?: string;
}


