/**
 * @swagger
 * /api/products/import/csv:
 *   post:
 *     summary: Import products from CSV file
 *     description: Upload a CSV file to import multiple products at once. Each product can automatically create an ad if a provider is specified.
 *     tags:
 *       - Products
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file containing product data
 *     responses:
 *       201:
 *         description: Products imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Products imported successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalRows:
 *                           type: integer
 *                           example: 10
 *                         successCount:
 *                           type: integer
 *                           example: 9
 *                         errorCount:
 *                           type: integer
 *                           example: 1
 *                         productsCreated:
 *                           type: integer
 *                           example: 9
 *                         adsCreated:
 *                           type: integer
 *                           example: 7
 *                     products:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "123e4567-e89b-12d3-a456-426614174000"
 *                           name:
 *                             type: string
 *                             example: "Product Name"
 *                           sku:
 *                             type: string
 *                             example: "product-name-abc123"
 *                           price:
 *                             type: number
 *                             example: 150.00
 *                           status:
 *                             type: string
 *                             example: "active"
 *                     ads:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "456e7890-e89b-12d3-a456-426614174000"
 *                           productId:
 *                             type: string
 *                             example: "123e4567-e89b-12d3-a456-426614174000"
 *                           advertiserId:
 *                             type: string
 *                             example: "789e0123-e89b-12d3-a456-426614174000"
 *                           status:
 *                             type: string
 *                             example: "active"
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           row:
 *                             type: integer
 *                             example: 5
 *                           data:
 *                             type: object
 *                           error:
 *                             type: string
 *                             example: "Product name is required"
 *       207:
 *         description: Import completed with some errors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Import completed with some errors
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                     products:
 *                       type: array
 *                     ads:
 *                       type: array
 *                     errors:
 *                       type: array
 *       400:
 *         description: Bad request - Invalid file or missing file
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: No file uploaded
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: User not authenticated
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Error processing product import
 */

/**
 * @swagger
 * /api/products/import/template:
 *   get:
 *     summary: Get CSV import template information
 *     description: Returns information about the expected CSV format, column descriptions, and an example row
 *     tags:
 *       - Products
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Template information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Import template information
 *                 data:
 *                   type: object
 *                   properties:
 *                     columns:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: "Product Name"
 *                           required:
 *                             type: boolean
 *                             example: true
 *                           description:
 *                             type: string
 *                             example: "Product name"
 *                     example:
 *                       type: object
 *                       additionalProperties:
 *                         type: string
 *                       example:
 *                         Provider: "Provider Name"
 *                         Marker: "Tag1, Tag2, Tag3"
 *                         Community: "Community Name"
 *                         Product Name: "Product Name"
 *                         Variation: "60 Caps"
 *                         Target Audience: "Profile A, Profile B"
 *                         Full Description: "Product description..."
 *                         Technical Specifications: "Spec 1, Spec 2"
 *                         Stock: "100"
 *                         Unit Price: "R$ 150,00"
 *                         Main Image: "https://example.com/image.png"
 *                         Secondary Images: ""
 *                     notes:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example:
 *                         - "File must be in CSV format"
 *                         - "Product name is required"
 *                         - "Price can be in Brazilian (R$ 100,00) or American ($100.00) format"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Internal server error
 */

