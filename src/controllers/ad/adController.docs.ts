/**
 * @swagger
 * /api/ads:
 *   post:
 *     summary: Create a new ad
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             oneOf:
 *               - required:
 *                   - productId
 *                 properties:
 *                   advertiserId:
 *                     type: string
 *                     description: Optional advertiser ID
 *                   productId:
 *                     type: string
 *                     description: ID of existing product
 *                   startDate:
 *                     type: string
 *                     format: date-time
 *                   endDate:
 *                     type: string
 *                     format: date-time
 *                   status:
 *                     type: string
 *                     enum: [active, inactive, expired]
 *                     default: active
 *                   targetAudience:
 *                     type: string
 *                   budget:
 *                     type: number
 *                     format: decimal
 *               - required:
 *                   - product
 *                 properties:
 *                   advertiserId:
 *                     type: string
 *                     description: Optional advertiser ID
 *                   product:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       image:
 *                         type: string
 *                         format: uri
 *                       price:
 *                         type: number
 *                         format: decimal
 *                       quantity:
 *                         type: integer
 *                       category:
 *                         type: string
 *                         enum: [amazon product, physical product, program]
 *                       externalUrl:
 *                         type: string
 *                         format: uri
 *                         description: External URL (e.g., Amazon product link). When provided, data will be fetched from URL
 *                       status:
 *                         type: string
 *                         enum: [active, inactive, out_of_stock]
 *                   startDate:
 *                     type: string
 *                     format: date-time
 *                   endDate:
 *                     type: string
 *                     format: date-time
 *                   status:
 *                     type: string
 *                     enum: [active, inactive, expired]
 *                     default: active
 *                   targetAudience:
 *                     type: string
 *                   budget:
 *                     type: number
 *                     format: decimal
 *     responses:
 *       201:
 *         description: Ad created successfully
 *       400:
 *         description: Invalid request - productId or product data required
 *       404:
 *         description: Advertiser or Product not found
 */

/**
 * @swagger
 * /api/ads/{id}:
 *   get:
 *     summary: Get ad by ID
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ad retrieved successfully. If product has externalUrl, data will be fetched from URL and prioritized
 *       404:
 *         description: Ad not found
 */

/**
 * @swagger
 * /api/ads:
 *   get:
 *     summary: List all ads
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: advertiserId
 *         schema:
 *           type: string
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *         description: Filter only currently active ads
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [amazon product, physical product, program]
 *         description: Filter ads by product category
 *     responses:
 *       200:
 *         description: List of ads retrieved successfully
 */

/**
 * @swagger
 * /api/ads/{id}:
 *   put:
 *     summary: Update ad
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               advertiserId:
 *                 type: string
 *                 nullable: true
 *                 description: Optional advertiser ID (can be null to remove)
 *               productId:
 *                 type: string
 *                 nullable: true
 *                 description: Optional product ID (can be null to remove)
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [active, inactive, expired]
 *               targetAudience:
 *                 type: string
 *               budget:
 *                 type: number
 *                 format: decimal
 *     responses:
 *       200:
 *         description: Ad updated successfully
 *       404:
 *         description: Ad not found
 */

/**
 * @swagger
 * /api/ads/{id}:
 *   delete:
 *     summary: Delete ad (soft delete)
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ad deleted successfully
 *       404:
 *         description: Ad not found
 */
