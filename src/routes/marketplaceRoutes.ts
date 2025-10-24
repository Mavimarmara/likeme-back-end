import { Router } from 'express';
import { 
  createProduct, 
  getProducts, 
  getProduct, 
  updateProduct, 
  deleteProduct,
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus
} from '@/controllers/marketplaceController';
import { 
  createProductSchema, 
  updateProductSchema, 
  createOrderSchema,
  searchSchema, 
  idParamSchema 
} from '@/utils/validationSchemas';
import { validate, validateQuery, validateParams } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';

const router = Router();

// Product routes (public)
router.get('/products', validateQuery(searchSchema), getProducts);
router.get('/products/:id', validateParams(idParamSchema), getProduct);

// Product routes (admin - would need admin middleware in real app)
router.post('/products', validate(createProductSchema), createProduct);
router.put('/products/:id', validateParams(idParamSchema), validate(updateProductSchema), updateProduct);
router.delete('/products/:id', validateParams(idParamSchema), deleteProduct);

// Order routes (authenticated)
router.post('/orders', authenticateToken, requireAuth, validate(createOrderSchema), createOrder);
router.get('/orders', authenticateToken, requireAuth, validateQuery(searchSchema), getOrders);
router.get('/orders/:id', authenticateToken, requireAuth, validateParams(idParamSchema), getOrder);
router.put('/orders/:id/status', authenticateToken, requireAuth, validateParams(idParamSchema), updateOrderStatus);

export default router;
