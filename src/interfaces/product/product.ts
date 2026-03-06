export interface ProductQueryFilters {
  type?: string; // product type: amazon product, physical product, program
  categoryId?: string; // domain category (FK to Category)
  status?: string;
  search?: string;
}

export interface UpdateStockOperation {
  quantity: number;
  operation: 'add' | 'subtract' | 'set';
}

