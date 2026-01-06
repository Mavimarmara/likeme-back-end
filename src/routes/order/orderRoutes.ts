import { Router } from 'express';
import {
  createOrder,
  getOrderById,
  getAllOrders,
  updateOrder,
  deleteOrder,
  cancelOrder,
  validateCartItems,
} from '@/controllers/order/orderController';
import {
  createOrderSchema,
  updateOrderSchema,
  idParamSchema,
  validateCartItemsSchema,
} from '@/utils/validationSchemas';
import { validate, validateParams } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);
router.use(requireAuth);

router.post('/validate-cart', generalRateLimiter, validate(validateCartItemsSchema), validateCartItems);
router.post('/', generalRateLimiter, validate(createOrderSchema), createOrder);
router.get('/', generalRateLimiter, getAllOrders);
router.get('/:id', generalRateLimiter, validateParams(idParamSchema), getOrderById);
router.put('/:id', generalRateLimiter, validate(updateOrderSchema), validateParams(idParamSchema), updateOrder);
router.delete('/:id', generalRateLimiter, validateParams(idParamSchema), deleteOrder);
router.post('/:id/cancel', generalRateLimiter, validateParams(idParamSchema), cancelOrder);

export default router;
