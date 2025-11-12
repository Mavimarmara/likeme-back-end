/**
 * @swagger
 * components:
 *   schemas:
 *     Tip:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         image:
 *           type: string
 *           format: uri
 *         order:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/tips:
 *   get:
 *     summary: Listar dicas de onboarding
 *     tags: [Tips]
 *     responses:
 *       200:
 *         description: Lista de dicas retornada com sucesso
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Tip'
 *       500:
 *         description: Erro ao buscar as dicas
 */

/**
 * @swagger
 * /api/tips:
 *   post:
 *     summary: Criar ou atualizar uma dica
 *     tags: [Tips]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *                 description: Informe para atualizar uma dica existente
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *               order:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Dica criada ou atualizada com sucesso
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Dica não encontrada (ao atualizar)
 */

/**
 * @swagger
 * /api/tips/{id}:
 *   delete:
 *     summary: Remover uma dica
 *     tags: [Tips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *     responses:
 *       200:
 *         description: Dica removida com sucesso
 *       404:
 *         description: Dica não encontrada
 */

