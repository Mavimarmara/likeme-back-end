/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Criar um novo pedido
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               userId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - produtoId
 *                     - quantity
 *                   properties:
 *                     produtoId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                     discount:
 *                       type: number
 *               status:
 *                 type: string
 *                 enum: [pending, processing, shipped, delivered, cancelled]
 *                 default: pending
 *               shippingCost:
 *                 type: number
 *                 default: 0
 *               tax:
 *                 type: number
 *                 default: 0
 *               shippingAddress:
 *                 type: string
 *               billingAddress:
 *                 type: string
 *               notes:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *               paymentStatus:
 *                 type: string
 *                 enum: [pending, paid, failed, refunded]
 *                 default: pending
 *               trackingNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: Pedido criado com sucesso
 *       400:
 *         description: Estoque insuficiente ou dados inválidos
 *       404:
 *         description: Produto ou usuário não encontrado
 */

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Obter pedido por ID
 *     tags: [Orders]
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
 *         description: Pedido obtido com sucesso
 *       403:
 *         description: Não autorizado
 *       404:
 *         description: Pedido não encontrado
 */

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Listar todos os pedidos
 *     tags: [Orders]
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
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de pedidos obtida com sucesso
 */

/**
 * @swagger
 * /api/orders/{id}:
 *   put:
 *     summary: Atualizar pedido
 *     tags: [Orders]
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
 *               status:
 *                 type: string
 *               paymentStatus:
 *                 type: string
 *               shippingAddress:
 *                 type: string
 *               billingAddress:
 *                 type: string
 *               trackingNumber:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pedido atualizado com sucesso
 *       403:
 *         description: Não autorizado
 *       404:
 *         description: Pedido não encontrado
 */

/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     summary: Deletar pedido (soft delete)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               restoreStock:
 *                 type: boolean
 *                 description: Se deve restaurar o estoque ao deletar
 *     responses:
 *       200:
 *         description: Pedido deletado com sucesso
 *       403:
 *         description: Não autorizado
 *       404:
 *         description: Pedido não encontrado
 */

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   post:
 *     summary: Cancelar pedido e restaurar estoque
 *     tags: [Orders]
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
 *         description: Pedido cancelado com sucesso
 *       400:
 *         description: Pedido já está cancelado
 *       403:
 *         description: Não autorizado
 *       404:
 *         description: Pedido não encontrado
 */
