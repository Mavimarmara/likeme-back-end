export interface ProductQueryFilters {
  category?: string;
  status?: string;
  search?: string;
}

export interface UpdateStockOperation {
  quantity: number;
  operation: 'add' | 'subtract' | 'set';
}

