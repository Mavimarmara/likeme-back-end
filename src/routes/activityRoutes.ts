import { Router } from 'express';
import { 
  createActivity, 
  getActivities, 
  getActivity, 
  updateActivity, 
  deleteActivity, 
  completeActivity 
} from '@/controllers/activityController';
import { 
  createActivitySchema, 
  updateActivitySchema, 
  searchSchema, 
  idParamSchema 
} from '@/utils/validationSchemas';
import { validate, validateQuery, validateParams } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken, requireAuth);

router.post('/', validate(createActivitySchema), createActivity);
router.get('/', validateQuery(searchSchema), getActivities);
router.get('/:id', validateParams(idParamSchema), getActivity);
router.put('/:id', validateParams(idParamSchema), validate(updateActivitySchema), updateActivity);
router.delete('/:id', validateParams(idParamSchema), deleteActivity);
router.patch('/:id/complete', validateParams(idParamSchema), completeActivity);

export default router;
