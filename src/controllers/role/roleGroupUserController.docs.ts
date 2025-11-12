/**
 * @swagger
 * /api/role-group-users:
 *   post:
 *     summary: Criar relação entre usuário e role group
 *     tags: [RoleGroupUsers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - roleGroupId
 *             properties:
 *               userId:
 *                 type: string
 *               roleGroupId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Relação criada com sucesso
 *       400:
 *         description: Dados inválidos
 */

/**
 * @swagger
 * /api/role-group-users/{userId}/{roleGroupId}:
 *   get:
 *     summary: Obter relação entre usuário e role group
 *     tags: [RoleGroupUsers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: roleGroupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Relação obtida com sucesso
 *       404:
 *         description: Relação não encontrada
 */

/**
 * @swagger
 * /api/role-group-users:
 *   get:
 *     summary: Listar todas as relações entre usuários e role groups
 *     tags: [RoleGroupUsers]
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
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: roleGroupId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de relações obtida com sucesso
 */

/**
 * @swagger
 * /api/role-group-users/{userId}/{roleGroupId}:
 *   delete:
 *     summary: Deletar relação entre usuário e role group (soft delete)
 *     tags: [RoleGroupUsers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: roleGroupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Relação deletada com sucesso
 *       404:
 *         description: Relação não encontrada
 */

