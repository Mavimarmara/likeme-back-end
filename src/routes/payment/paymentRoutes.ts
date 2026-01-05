import { Router } from 'express';
import {
  processPayment,
  getPaymentStatus,
  capturePayment,
  refundPayment,
} from '@/controllers/payment/paymentController';
import {
  createIndividualRecipient,
  createCorporationRecipient,
  getRecipientById,
  listAllRecipients,
} from '@/controllers/payment/recipientController';
import { authenticateToken } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';
import { validate, validateParams } from '@/middleware/validation';
import {
  processPaymentSchema,
  transactionIdParamSchema,
  capturePaymentSchema,
  refundPaymentSchema,
  recipientIdParamSchema,
} from '@/utils/validationSchemas';

const router = Router();

router.post(
  '/process',
  generalRateLimiter,
  authenticateToken,
  validate(processPaymentSchema),
  processPayment
);

router.get(
  '/status/:transactionId',
  generalRateLimiter,
  authenticateToken,
  validateParams(transactionIdParamSchema),
  getPaymentStatus
);

router.post(
  '/capture/:transactionId',
  generalRateLimiter,
  authenticateToken,
  validateParams(transactionIdParamSchema),
  validate(capturePaymentSchema),
  capturePayment
);

router.post(
  '/refund/:transactionId',
  generalRateLimiter,
  authenticateToken,
  validateParams(transactionIdParamSchema),
  validate(refundPaymentSchema),
  refundPayment
);

router.post(
  '/recipients/individual',
  generalRateLimiter,
  authenticateToken,
  createIndividualRecipient
);

router.post(
  '/recipients/corporation',
  generalRateLimiter,
  authenticateToken,
  createCorporationRecipient
);

router.get(
  '/recipients/:recipientId',
  generalRateLimiter,
  authenticateToken,
  validateParams(recipientIdParamSchema),
  getRecipientById
);

router.get(
  '/recipients',
  generalRateLimiter,
  authenticateToken,
  listAllRecipients
);

export default router;
