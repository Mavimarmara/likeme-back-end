import { Router } from 'express';
import {
  createPerson,
  getPersonById,
  getAllPersons,
  updatePerson,
  deletePerson,
} from '@/controllers/personController';
import { createPersonSchema, updatePersonSchema, idParamSchema } from '@/utils/validationSchemas';
import { validate } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);
router.use(requireAuth);

// CRUD endpoints
router.post('/', generalRateLimiter, validate(createPersonSchema), createPerson);
router.get('/', generalRateLimiter, getAllPersons);
router.get('/:id', generalRateLimiter, validate(idParamSchema, 'params'), getPersonById);
router.put('/:id', generalRateLimiter, validate(updatePersonSchema), validate(idParamSchema, 'params'), updatePerson);
router.delete('/:id', generalRateLimiter, validate(idParamSchema, 'params'), deletePerson);

export default router;

