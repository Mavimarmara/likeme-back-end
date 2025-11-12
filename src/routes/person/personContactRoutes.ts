import { Router } from 'express';
import {
  createPersonContact,
  getPersonContactById,
  getAllPersonContacts,
  updatePersonContact,
  deletePersonContact,
} from '@/controllers/person/personContactController';
import { createPersonContactSchema, updatePersonContactSchema, idParamSchema } from '@/utils/validationSchemas';
import { validate, validateParams } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);
router.use(requireAuth);

router.post('/', generalRateLimiter, validate(createPersonContactSchema), createPersonContact);
router.get('/', generalRateLimiter, getAllPersonContacts);
router.get('/:id', generalRateLimiter, validateParams(idParamSchema), getPersonContactById);
router.put('/:id', generalRateLimiter, validate(updatePersonContactSchema), validateParams(idParamSchema), updatePersonContact);
router.delete('/:id', generalRateLimiter, validateParams(idParamSchema), deletePersonContact);

export default router;

