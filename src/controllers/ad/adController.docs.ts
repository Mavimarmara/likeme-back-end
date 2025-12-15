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
 *             required:
 *               - advertiserId
 *               - title
 *             properties:
 *               advertiserId:
 *                 type: string
 *               productId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: uri
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [active, inactive, expired]
 *                 default: active
 *               targetAudience:
 *                 type: string
 *               budget:
 *                 type: number
 *                 format: decimal
 *               externalUrl:
 *                 type: string
 *                 format: uri
 *                 description: External URL for the ad (e.g., Amazon product link)
 *               category:
 *                 type: string
 *                 enum: [amazon product, physical product, program]
 *                 description: Category of the ad
 *     responses:
 *       201:
 *         description: Ad created successfully
 *       404:
 *         description: Advertiser not found
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
 *         description: Ad retrieved successfully
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
 *         description: Filter ads by category
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
 *               productId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *               targetAudience:
 *                 type: string
 *               budget:
 *                 type: number
 *               externalUrl:
 *                 type: string
 *                 format: uri
 *                 description: External URL for the ad (e.g., Amazon product link)
 *               category:
 *                 type: string
 *                 enum: [amazon product, physical product, program]
 *                 description: Category of the ad
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

