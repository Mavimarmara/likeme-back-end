export interface OrderItemInput {
  productId: string;
  quantity: number;
  discount?: number;
}

export interface CreateOrderData {
  userId: string;
  items: OrderItemInput[];
  status?: string;
  shippingCost?: number;
  tax?: number;
  shippingAddress?: string;
  billingAddress?: any;
  notes?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  trackingNumber?: string;
  cardData?: any;
}

export interface OrderQueryFilters {
  userId?: string;
  status?: string;
  paymentStatus?: string;
}

