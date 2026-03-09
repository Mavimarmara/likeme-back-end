import { Router } from 'express';
import {
  createAdvertiser,
  getAdvertiserById,
  getAdvertiserByUserId,
  getAllAdvertisers,
  updateAdvertiser,
  deleteAdvertiser,
} from '@/controllers/advertiser/advertiserController';
import {
  importAdvertiserProfilesFromCSV,
  downloadAdvertiserProfileTemplate,
} from '@/controllers/advertiser/advertiserProfileImportController';
import {
  createAdvertiserSchema,
  updateAdvertiserSchema,
  idParamSchema,
  userIdParamSchema,
} from '@/utils/validationSchemas';
import { validate, validateParams } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';
import { uploadCSV } from '@/middleware/upload';

const router = Router();

router.use(authenticateToken);
router.use(requireAuth);

// Importação de perfis de advertisers (providers)
router.post(
  '/profiles/import/csv',
  generalRateLimiter,
  uploadCSV,
  importAdvertiserProfilesFromCSV
);
router.get(
  '/profiles/import/template',
  generalRateLimiter,
  downloadAdvertiserProfileTemplate
);

router.post('/', generalRateLimiter, validate(createAdvertiserSchema), createAdvertiser);
router.get('/', generalRateLimiter, getAllAdvertisers);
router.get('/:id', generalRateLimiter, validateParams(idParamSchema), getAdvertiserById);
router.get('/user/:userId', generalRateLimiter, validateParams(userIdParamSchema), getAdvertiserByUserId);
router.put('/:id', generalRateLimiter, validate(updateAdvertiserSchema), validateParams(idParamSchema), updateAdvertiser);
router.delete('/:id', generalRateLimiter, validateParams(idParamSchema), deleteAdvertiser);

export default router;
