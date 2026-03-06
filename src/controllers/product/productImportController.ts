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
    const message = result.totalRows === 0
      ? 'Nenhuma linha de produto encontrada. Verifique o formato do CSV (delimitador ;, primeira linha vazia ou cabeçalhos na segunda linha, coluna "Nome do produto").'
      : result.success
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
    // Cabeçalhos alinhados ao "Template Produto Físico Like_Me" (delimitador: ;)
    // Coluna "Categorias" aceita um valor ou vários em inglês separados por vírgula (ex: Self-esteem, Stress, Spirituality)
    const csvContent = `;;;;;;;;;;;;
;Provider;Categorias;Comunidade;Nome do produto;Variação;Indicado para;Descrição completa e benefícios;Lista de especificações técnicas;Estoque;Preço unitário;Imagem principal;Imagens secundárias
;Exemplo Marca;Autoestima;Círculo de Cura e Crescimento;Produto Exemplo;60 Caps;Perfil Evitativo;Benefícios e como usar.;Lion's Mane 400mg;100;150,00;https://exemplo.com/imagem.png;`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="likeme-template-produto-fisico.csv"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send('\uFEFF' + csvContent);
  } catch (error: any) {
    console.error('[ProductImport] Error downloading template:', error);
    sendError(res, 'Error downloading template', 500, error?.message);
  }
};
