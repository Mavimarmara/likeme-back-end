/**
 * @swagger
 * /api/amazon/product-by-url:
 *   get:
 *     summary: Get Amazon product information by external URL (web scraping)
 *     tags: [Amazon]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: externalUrl
 *         required: true
 *         schema:
 *           type: string
 *           format: uri
 *         description: Amazon product URL (e.g., https://www.amazon.com.br/dp/B0BLJTJ38M)
 *     responses:
 *       200:
 *         description: Amazon product information extracted successfully from the page
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     asin:
 *                       type: string
 *                       description: Amazon Standard Identification Number
 *                     title:
 *                       type: string
 *                       description: Product title/name
 *                     brand:
 *                       type: string
 *                       description: Product brand/manufacturer
 *                     image:
 *                       type: string
 *                       description: Main product image URL
 *                     images:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Array of product image URLs
 *                     price:
 *                       type: number
 *                       description: Product price as number
 *                     currency:
 *                       type: string
 *                       default: BRL
 *                     priceDisplay:
 *                       type: string
 *                       description: Formatted price string (e.g., "R$ 649,90")
 *                     description:
 *                       type: string
 *                       description: Product description
 *                     availability:
 *                       type: string
 *                     rating:
 *                       type: number
 *                       description: Product rating (0-5)
 *                     reviewCount:
 *                       type: number
 *                       description: Number of customer reviews
 *                     url:
 *                       type: string
 *                       description: Product page URL
 *                     externalUrl:
 *                       type: string
 *                       description: Original external URL provided
 *       400:
 *         description: Invalid URL or missing parameter
 *       404:
 *         description: Product not found or could not extract data
 *       500:
 *         description: Error retrieving product from Amazon page
 */

/**
 * @swagger
 * /api/amazon/product-by-ad/{adId}:
 *   get:
 *     summary: Get Amazon product information from an ad's external URL
 *     tags: [Amazon]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adId
 *         required: true
 *         schema:
 *           type: string
 *         description: Ad ID that contains an externalUrl pointing to Amazon
 *     responses:
 *       200:
 *         description: Amazon product information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     asin:
 *                       type: string
 *                     title:
 *                       type: string
 *                     brand:
 *                       type: string
 *                     image:
 *                       type: string
 *                     price:
 *                       type: number
 *                     currency:
 *                       type: string
 *                     priceDisplay:
 *                       type: string
 *                     availability:
 *                       type: string
 *                     rating:
 *                       type: number
 *                     reviewCount:
 *                       type: number
 *                     url:
 *                       type: string
 *                     externalUrl:
 *                       type: string
 *                     ad:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         description:
 *                           type: string
 *                         category:
 *                           type: string
 *       400:
 *         description: Ad not found or does not have external URL
 *       404:
 *         description: Ad or product not found
 *       500:
 *         description: Error extracting product data from Amazon page
 */

