import { Router } from 'express';
import { 
  createAnamnese, 
  getAnamnese, 
  updateAnamnese, 
  deleteAnamnese 
} from '@/controllers/anamneseController';
import { createAnamneseSchema } from '@/utils/validationSchemas';
import { validate } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken, requireAuth);

router.post('/', validate(createAnamneseSchema), createAnamnese);
router.get('/', getAnamnese);
router.put('/', validate(createAnamneseSchema), updateAnamnese);
router.delete('/', deleteAnamnese);

export default router;
