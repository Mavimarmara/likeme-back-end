/**
 * @swagger
 * tags:
 *   name: Payment
 *   description: Payment processing endpoints using Pagarme
 */

/**
 * @swagger
 * /api/payment/process:
 *   post:
 *     summary: Process payment for an order
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - cardData
 *               - billingAddress
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: Order ID to process payment
 *               cardData:
 *                 type: object
 *                 required:
 *                   - cardNumber
 *                   - cardHolderName
 *                   - cardExpirationDate
 *                   - cardCvv
 *                 properties:
 *                   cardNumber:
 *                     type: string
 *                     description: Credit card number (with or without spaces)
 *                     example: "4111111111111111"
 *                   cardHolderName:
 *                     type: string
 *                     description: Cardholder name
 *                     example: "John Doe"
 *                   cardExpirationDate:
 *                     type: string
 *                     description: Card expiration date in MMYY format
 *                     example: "1225"
 *                   cardCvv:
 *                     type: string
 *                     description: Card CVV
 *                     example: "123"
 *               billingAddress:
 *                 type: object
 *                 required:
 *                   - street
 *                   - city
 *                   - state
 *                   - zipcode
 *                 properties:
 *                   country:
 *                     type: string
 *                     default: "br"
 *                   state:
 *                     type: string
 *                     description: State (UF)
 *                     example: "SP"
 *                   city:
 *                     type: string
 *                     example: "São Paulo"
 *                   neighborhood:
 *                     type: string
 *                     example: "Jardins"
 *                   street:
 *                     type: string
 *                     example: "Av. Paulista"
 *                   streetNumber:
 *                     type: string
 *                     example: "1000"
 *                   zipcode:
 *                     type: string
 *                     description: ZIP code (CEP)
 *                     example: "01310000"
 *                   complement:
 *                     type: string
 *                     example: "Apto 101"
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     order:
 *                       $ref: '#/components/schemas/Order'
 *                     transaction:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         status:
 *                           type: string
 *                         authorizationCode:
 *                           type: string
 *       400:
 *         description: Invalid request or payment failed
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to process payment for this order
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * /api/payment/status/{transactionId}:
 *   get:
 *     summary: Get payment transaction status
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Pagarme transaction ID
 *     responses:
 *       200:
 *         description: Transaction status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     authorizationCode:
 *                       type: string
 *                     amount:
 *                       type: number
 *                       description: Transaction amount in reais
 *                     orderId:
 *                       type: string
 *                       nullable: true
 *                       description: Related order ID if found
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to view this transaction
 *       404:
 *         description: Transaction not found
 */

/**
 * @swagger
 * /api/payment/capture/{transactionId}:
 *   post:
 *     summary: Capture an authorized transaction
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Pagarme transaction ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to capture (for partial capture, in reais)
 *     responses:
 *       200:
 *         description: Payment captured successfully
 *       400:
 *         description: Error capturing transaction
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /api/payment/refund/{transactionId}:
 *   post:
 *     summary: Refund a payment
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Pagarme transaction ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to refund (for partial refund, in reais)
 *     responses:
 *       200:
 *         description: Payment refunded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                     orderId:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Error refunding transaction
 *       401:
 *         description: Not authenticated
 */
