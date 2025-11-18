import { Router } from 'express';
import {
  createOrUpdatePerson,
  getPersonById,
  getAllPersons,
  updatePerson,
  deletePerson,
} from '@/controllers/person/person/personController';
import { createPersonSchema, updatePersonSchema, idParamSchema } from '@/utils/validationSchemas';
import { validate, validateParams } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);
router.use(requireAuth);

// POST agora é create or update (upsert) - atualiza a person do usuário autenticado
router.post('/', generalRateLimiter, validate(createPersonSchema), createOrUpdatePerson);
router.get('/', generalRateLimiter, getAllPersons);
router.get('/:id', generalRateLimiter, validateParams(idParamSchema), getPersonById);
router.put('/:id', generalRateLimiter, validate(updatePersonSchema), validateParams(idParamSchema), updatePerson);
router.delete('/:id', generalRateLimiter, validateParams(idParamSchema), deletePerson);

export default router;

