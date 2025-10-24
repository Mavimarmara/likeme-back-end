import { Router } from 'express';
import { 
  createWellnessData, 
  getWellnessData, 
  getWellnessSummary, 
  updateWellnessData, 
  deleteWellnessData 
} from '@/controllers/wellnessController';
import { 
  createWellnessDataSchema, 
  searchSchema, 
  idParamSchema 
} from '@/utils/validationSchemas';
import { validate, validateQuery, validateParams } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken, requireAuth);

router.post('/', validate(createWellnessDataSchema), createWellnessData);
router.get('/', validateQuery(searchSchema), getWellnessData);
router.get('/summary', validateQuery(searchSchema), getWellnessSummary);
router.put('/:id', validateParams(idParamSchema), validate(createWellnessDataSchema), updateWellnessData);
router.delete('/:id', validateParams(idParamSchema), deleteWellnessData);

export default router;
