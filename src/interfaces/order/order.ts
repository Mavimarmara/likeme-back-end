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

export interface CartItemValidation {
  productId: string;
  valid: boolean;
  reason?: 'not_found' | 'out_of_stock' | 'insufficient_stock' | 'external_url' | 'no_price' | 'inactive';
  availableQuantity?: number;
  requestedQuantity?: number;
}

export interface ValidateCartItemsResponse {
  validItems: OrderItemInput[];
  invalidItems: CartItemValidation[];
}

