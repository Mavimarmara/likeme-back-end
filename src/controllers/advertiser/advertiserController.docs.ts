/**
 * @swagger
 * /api/advertisers:
 *   post:
 *     summary: Criar um novo anunciante
 *     tags: [Advertisers]
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
 *               userId:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               logo:
 *                 type: string
 *                 format: uri
 *               contactEmail:
 *                 type: string
 *                 format: email
 *               contactPhone:
 *                 type: string
 *               website:
 *                 type: string
 *                 format: uri
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *                 default: active
 *     responses:
 *       201:
 *         description: Anunciante criado com sucesso
 *       404:
 *         description: Usuário não encontrado
 *       409:
 *         description: Usuário já é um anunciante
 */

/**
 * @swagger
 * /api/advertisers/{id}:
 *   get:
 *     summary: Obter anunciante por ID
 *     tags: [Advertisers]
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
 *         description: Anunciante obtido com sucesso
 *       404:
 *         description: Anunciante não encontrado
 */

/**
 * @swagger
 * /api/advertisers/user/{userId}:
 *   get:
 *     summary: Obter anunciante por ID do usuário
 *     tags: [Advertisers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Anunciante obtido com sucesso
 *       404:
 *         description: Anunciante não encontrado
 */

/**
 * @swagger
 * /api/advertisers:
 *   get:
 *     summary: Listar todos os anunciantes
 *     tags: [Advertisers]
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
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de anunciantes obtida com sucesso
 */

/**
 * @swagger
 * /api/advertisers/{id}:
 *   put:
 *     summary: Atualizar anunciante
 *     tags: [Advertisers]
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
 *               logo:
 *                 type: string
 *               contactEmail:
 *                 type: string
 *               contactPhone:
 *                 type: string
 *               website:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Anunciante atualizado com sucesso
 *       403:
 *         description: Não autorizado
 *       404:
 *         description: Anunciante não encontrado
 */

/**
 * @swagger
 * /api/advertisers/{id}:
 *   delete:
 *     summary: Deletar anunciante (soft delete)
 *     tags: [Advertisers]
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
 *         description: Anunciante deletado com sucesso
 *       403:
 *         description: Não autorizado
 *       404:
 *         description: Anunciante não encontrado
 */
