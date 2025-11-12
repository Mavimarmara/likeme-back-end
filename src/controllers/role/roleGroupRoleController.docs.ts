/**
 * @swagger
 * /api/role-group-roles:
 *   post:
 *     summary: Criar relação entre role group e role
 *     tags: [RoleGroupRoles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleGroupId
 *               - roleId
 *             properties:
 *               roleGroupId:
 *                 type: string
 *               roleId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Relação criada com sucesso
 *       400:
 *         description: Dados inválidos
 */

/**
 * @swagger
 * /api/role-group-roles/{roleGroupId}/{roleId}:
 *   get:
 *     summary: Obter relação entre role group e role
 *     tags: [RoleGroupRoles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleGroupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: roleId
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
 * /api/role-group-roles:
 *   get:
 *     summary: Listar todas as relações entre role groups e roles
 *     tags: [RoleGroupRoles]
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
 *         name: roleGroupId
 *         schema:
 *           type: string
 *       - in: query
 *         name: roleId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de relações obtida com sucesso
 */

/**
 * @swagger
 * /api/role-group-roles/{roleGroupId}/{roleId}:
 *   delete:
 *     summary: Deletar relação entre role group e role (soft delete)
 *     tags: [RoleGroupRoles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleGroupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Relação deletada com sucesso
 *       404:
 *         description: Relação não encontrada
 */

