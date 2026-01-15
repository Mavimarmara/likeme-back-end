import { Router } from 'express';
import {
  createProduct,
  getProductById,
  getAllProducts,
  updateProduct,
  deleteProduct,
  updateStock,
} from '@/controllers/product/productController';
import {
  importProductsFromCSV,
  getImportTemplate,
  downloadImportTemplate,
} from '@/controllers/product/productImportController';
import '@/controllers/product/productImportController.docs';
import {
  createProductSchema,
  updateProductSchema,
  idParamSchema,
  updateStockSchema,
} from '@/utils/validationSchemas';
import { validate, validateParams } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';
import { generalRateLimiter } from '@/middleware/rateLimiter';
import { uploadCSV } from '@/middleware/upload';

const router = Router();

router.use(authenticateToken);
router.use(requireAuth);

// Rotas de importação CSV
router.post('/import/csv', generalRateLimiter, uploadCSV, importProductsFromCSV);
router.get('/import/template', generalRateLimiter, getImportTemplate);
router.get('/import/template/download', generalRateLimiter, downloadImportTemplate);

// Rotas de produtos
router.post('/', generalRateLimiter, validate(createProductSchema), createProduct);
router.get('/', generalRateLimiter, getAllProducts);
router.get('/:id', generalRateLimiter, validateParams(idParamSchema), getProductById);
router.put('/:id', generalRateLimiter, validate(updateProductSchema), validateParams(idParamSchema), updateProduct);
router.delete('/:id', generalRateLimiter, validateParams(idParamSchema), deleteProduct);
router.patch('/:id/stock', generalRateLimiter, validate(updateStockSchema), validateParams(idParamSchema), updateStock);

export default router;
