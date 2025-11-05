import { Router } from 'express';
import {
  createPersonContact,
  getPersonContactById,
  getAllPersonContacts,
  updatePersonContact,
  deletePersonContact,
} from '@/controllers/personContactController';
import { createPersonContactSchema, updatePersonContactSchema, idParamSchema } from '@/utils/validationSchemas';
import { validate } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);
router.use(requireAuth);

router.post('/', generalRateLimiter, validate(createPersonContactSchema), createPersonContact);
router.get('/', generalRateLimiter, getAllPersonContacts);
router.get('/:id', generalRateLimiter, validate(idParamSchema, 'params'), getPersonContactById);
router.put('/:id', generalRateLimiter, validate(updatePersonContactSchema), validate(idParamSchema, 'params'), updatePersonContact);
router.delete('/:id', generalRateLimiter, validate(idParamSchema, 'params'), deletePersonContact);

export default router;

