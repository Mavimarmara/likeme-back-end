import { Router } from 'express';
import { 
  createHealthProvider, 
  getHealthProviders, 
  getHealthProvider, 
  updateHealthProvider, 
  deleteHealthProvider,
  createAppointment,
  getAppointments,
  getAppointment,
  updateAppointment,
  deleteAppointment
} from '@/controllers/healthProviderController';
import { 
  createHealthProviderSchema, 
  updateHealthProviderSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
  searchSchema, 
  idParamSchema 
} from '@/utils/validationSchemas';
import { validate, validateQuery, validateParams } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';

const router = Router();

// Health Provider routes (public for search)
router.get('/providers', validateQuery(searchSchema), getHealthProviders);
router.get('/providers/:id', validateParams(idParamSchema), getHealthProvider);

// Health Provider management routes (authenticated)
router.post('/providers', authenticateToken, requireAuth, validate(createHealthProviderSchema), createHealthProvider);
router.put('/providers/:id', authenticateToken, requireAuth, validateParams(idParamSchema), validate(updateHealthProviderSchema), updateHealthProvider);
router.delete('/providers/:id', authenticateToken, requireAuth, validateParams(idParamSchema), deleteHealthProvider);

// Appointment routes (authenticated)
router.post('/appointments', authenticateToken, requireAuth, validate(createAppointmentSchema), createAppointment);
router.get('/appointments', authenticateToken, requireAuth, validateQuery(searchSchema), getAppointments);
router.get('/appointments/:id', authenticateToken, requireAuth, validateParams(idParamSchema), getAppointment);
router.put('/appointments/:id', authenticateToken, requireAuth, validateParams(idParamSchema), validate(updateAppointmentSchema), updateAppointment);
router.delete('/appointments/:id', authenticateToken, requireAuth, validateParams(idParamSchema), deleteAppointment);

export default router;
