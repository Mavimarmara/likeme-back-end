import rateLimit from 'express-rate-limit';
import { config } from '@/config';

export const createRateLimiter = (windowMs?: number, max?: number) => {
  return rateLimit({
    windowMs: windowMs || config.rateLimit.windowMs,
    max: max || config.rateLimit.maxRequests,
    message: {
      success: false,
      message: 'Muitas tentativas. Tente novamente mais tarde.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

export const authRateLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 minutes
export const generalRateLimiter = createRateLimiter();
