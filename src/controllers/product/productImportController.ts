import { Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { sendSuccess, sendError } from '@/utils/response';
import { productImportService } from '@/services/product/productImportService';

export const importProductsFromCSV = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      sendError(res, 'No file uploaded', 400);
      return;
    }

    const allowedMimeTypes = [
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'text/plain',
    ];

    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      sendError(res, 'File must be CSV type', 400);
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    console.log(`[ProductImport] Starting import for user ${userId}`);
    console.log(`[ProductImport] File: ${req.file.originalname} (${req.file.size} bytes)`);

    const result = await productImportService.importFromCSV(req.file.buffer, userId);

    console.log(`[ProductImport] Import completed:`);
    console.log(`  - Total rows: ${result.totalRows}`);
    console.log(`  - Success: ${result.successCount}`);
    console.log(`  - Errors: ${result.errorCount}`);
    console.log(`  - Products created: ${result.createdProducts.length}`);
    console.log(`  - Ads created: ${result.createdAds.length}`);

    const statusCode = result.success ? 201 : 207;
    const message = result.success
      ? 'Products imported successfully'
      : 'Import completed with some errors';

    sendSuccess(
      res,
      {
        summary: {
          totalRows: result.totalRows,
          successCount: result.successCount,
          errorCount: result.errorCount,
          productsCreated: result.createdProducts.length,
          adsCreated: result.createdAds.length,
        },
        products: result.createdProducts.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: p.price,
          status: p.status,
        })),
        ads: result.createdAds.map(a => ({
          id: a.id,
          productId: a.productId,
          advertiserId: a.advertiserId,
          status: a.status,
        })),
        errors: result.errors,
      },
      message,
      statusCode
    );
  } catch (error: any) {
    console.error('[ProductImport] Error importing products:', error);
    sendError(
      res,
      'Error processing product import',
      500,
      error?.message
    );
  }
};

export const downloadImportTemplate = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const csvContent = `Provider;Marker;Community;Product Name;Variation;Target Audience;Full Description;Technical Specifications;Stock;Unit Price;Main Image;Secondary Images
Diogo Lara;Self-esteem, Purpose & vision, Stress;Círculo de Cura e Crescimento;Endura;60 Caps;Perfil Evitativo, Perfil Melancólico;Como tomar: iniciar com 1 cápsula pela manhã. Principais benefícios: melhora cognitiva e redução de estresse.;Lion's Mane 400mg, Cordyceps sinensis 100mg;100;150.00;https://example.com/image.png;https://example.com/image2.png`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="likeme-products-import.csv"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send('\uFEFF' + csvContent);
  } catch (error: any) {
    console.error('[ProductImport] Error downloading template:', error);
    sendError(res, 'Error downloading template', 500, error?.message);
  }
};
