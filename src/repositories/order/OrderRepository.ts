export interface OrderRepository {
  save(data: CreateOrderData): Promise<{ id: string }>;
  findById(id: string): Promise<OrderData | null>;
  findByUserId(userId: string, filters?: OrderFilters): Promise<OrderData[]>;
  update(id: string, data: UpdateOrderData): Promise<void>;
  delete(id: string): Promise<void>;
  findWithItems(id: string): Promise<OrderWithItemsData | null>;
}

export interface CreateOrderData {
  userId: string;
  total: number;
  subtotal: number;
  shippingCost?: number;
  tax?: number;
  status?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentTransactionId?: string;
  shippingAddress?: string;
  billingAddress?: string;
  notes?: string;
  items: OrderItemData[];
}

export interface OrderItemData {
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  discount?: number;
}

export interface OrderData {
  id: string;
  userId: string;
  total: number;
  subtotal: number;
  shippingCost: number;
  tax: number;
  status: string;
  paymentMethod: string | null;
  paymentStatus: string;
  paymentTransactionId: string | null;
  shippingAddress: string | null;
  billingAddress: string | null;
  notes: string | null;
  trackingNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderWithItemsData extends OrderData {
  items: OrderItemWithProductData[];
  user: {
    id: string;
    username: string | null;
  };
}

export interface OrderItemWithProductData {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  discount: number;
  product: {
    id: string;
    name: string;
    description: string | null;
  };
}

export interface UpdateOrderData {
  status?: string;
  paymentStatus?: string;
  paymentTransactionId?: string;
  trackingNumber?: string;
  shippingAddress?: string;
  billingAddress?: string;
  notes?: string;
}

export interface OrderFilters {
  status?: string;
  fromDate?: Date;
  toDate?: Date;
}

