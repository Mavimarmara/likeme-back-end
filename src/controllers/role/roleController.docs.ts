/**
 * @swagger
 * /api/roles:
 *   post:
 *     summary: Criar uma nova role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Role criada com sucesso
 *       400:
 *         description: Dados inválidos
 */

/**
 * @swagger
 * /api/roles/{id}:
 *   get:
 *     summary: Obter role por ID
 *     tags: [Roles]
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
 *         description: Role obtida com sucesso
 *       404:
 *         description: Role não encontrada
 */

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Listar todas as roles
 *     tags: [Roles]
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
 *     responses:
 *       200:
 *         description: Lista de roles obtida com sucesso
 */

/**
 * @swagger
 * /api/roles/{id}:
 *   put:
 *     summary: Atualizar role
 *     tags: [Roles]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Role atualizada com sucesso
 *       404:
 *         description: Role não encontrada
 */

/**
 * @swagger
 * /api/roles/{id}:
 *   delete:
 *     summary: Deletar role (soft delete)
 *     tags: [Roles]
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
 *         description: Role deletada com sucesso
 *       404:
 *         description: Role não encontrada
 */

