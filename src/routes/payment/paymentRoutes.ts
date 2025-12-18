import { Router } from 'express';
import {
  processPayment,
  getPaymentStatus,
  capturePayment,
  refundPayment,
} from '@/controllers/payment/paymentController';
import { authenticateToken } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';
import { validate, validateParams } from '@/middleware/validation';
import {
  processPaymentSchema,
  transactionIdParamSchema,
  capturePaymentSchema,
  refundPaymentSchema,
} from '@/utils/validationSchemas';

const router = Router();

/**
 * @route   POST /api/payment/process
 * @desc    Process payment for an order
 * @access  Private
 */
router.post(
  '/process',
  generalRateLimiter,
  authenticateToken,
  validate(processPaymentSchema),
  processPayment
);

/**
 * @route   GET /api/payment/status/:transactionId
 * @desc    Get payment transaction status
 * @access  Private
 */
router.get(
  '/status/:transactionId',
  generalRateLimiter,
  authenticateToken,
  validateParams(transactionIdParamSchema),
  getPaymentStatus
);

/**
 * @route   POST /api/payment/capture/:transactionId
 * @desc    Capture an authorized transaction
 * @access  Private
 */
router.post(
  '/capture/:transactionId',
  generalRateLimiter,
  authenticateToken,
  validateParams(transactionIdParamSchema),
  validate(capturePaymentSchema),
  capturePayment
);

/**
 * @route   POST /api/payment/refund/:transactionId
 * @desc    Refund a payment
 * @access  Private
 */
router.post(
  '/refund/:transactionId',
  generalRateLimiter,
  authenticateToken,
  validateParams(transactionIdParamSchema),
  validate(refundPaymentSchema),
  refundPayment
);

export default router;
