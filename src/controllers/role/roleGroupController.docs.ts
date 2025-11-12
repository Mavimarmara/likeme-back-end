/**
 * @swagger
 * /api/role-groups:
 *   post:
 *     summary: Criar um novo role group
 *     tags: [RoleGroups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - name
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: RoleGroup criado com sucesso
 *       400:
 *         description: Dados inválidos
 */

/**
 * @swagger
 * /api/role-groups/{id}:
 *   get:
 *     summary: Obter role group por ID
 *     tags: [RoleGroups]
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
 *         description: RoleGroup obtido com sucesso
 *       404:
 *         description: RoleGroup não encontrado
 */

/**
 * @swagger
 * /api/role-groups:
 *   get:
 *     summary: Listar todos os role groups
 *     tags: [RoleGroups]
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
 *         description: Lista de role groups obtida com sucesso
 */

/**
 * @swagger
 * /api/role-groups/{id}:
 *   put:
 *     summary: Atualizar role group
 *     tags: [RoleGroups]
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
 *         description: RoleGroup atualizado com sucesso
 *       404:
 *         description: RoleGroup não encontrado
 */

/**
 * @swagger
 * /api/role-groups/{id}:
 *   delete:
 *     summary: Deletar role group (soft delete)
 *     tags: [RoleGroups]
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
 *         description: RoleGroup deletado com sucesso
 *       404:
 *         description: RoleGroup não encontrado
 */

