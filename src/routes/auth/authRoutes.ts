import { Router } from 'express';
import { 
  register, 
  login,
  getIdToken,
  verifyToken,
  logout,
  getProfile, 
  updateProfile, 
  deleteAccount 
} from '@/controllers/auth/authController';
import { 
  createUserSchema, 
  loginSchema,
  getIdTokenSchema,
  verifyTokenSchema,
  updateUserSchema 
} from '@/utils/validationSchemas';
import { validate } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { authRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

router.post('/register', authRateLimiter, validate(createUserSchema), register);
router.post('/login', authRateLimiter, validate(loginSchema), login);
router.post('/idtoken', authRateLimiter, validate(getIdTokenSchema), getIdToken);
router.post('/verify', authRateLimiter, validate(verifyTokenSchema), verifyToken);

router.post('/logout', authenticateToken, requireAuth, logout);
router.get('/profile', authenticateToken, requireAuth, getProfile);
router.put('/profile', authenticateToken, requireAuth, validate(updateUserSchema), updateProfile);
router.delete('/account', authenticateToken, requireAuth, deleteAccount);

export default router;
