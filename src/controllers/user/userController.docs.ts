/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Criar um novo usuário
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - personId
 *               - password
 *             properties:
 *               personId:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               salt:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: uri
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *       404:
 *         description: Pessoa não encontrada
 *       409:
 *         description: Usuário já existe
 */

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Obter usuário por ID (inclui dados do Social Plus se disponível)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário no banco de dados
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           default: public
 *         description: Tipo de dados do usuário no Social Plus (public)
 *     responses:
 *       200:
 *         description: Usuário obtido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Dados do usuário local combinados com dados do Social Plus (se disponível)
 *                   properties:
 *                     id:
 *                       type: string
 *                     personId:
 *                       type: string
 *                     username:
 *                       type: string
 *                     avatar:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *                     socialPlusUserId:
 *                       type: string
 *                     person:
 *                       type: object
 *                     roleGroups:
 *                       type: array
 *                     socialPlus:
 *                       type: object
 *                       description: Dados do usuário no Social Plus (se o usuário tiver socialPlusUserId)
 *                       properties:
 *                         users:
 *                           type: array
 *                           items:
 *                             type: object
 *                         roles:
 *                           type: array
 *                           items:
 *                             type: object
 *                         files:
 *                           type: array
 *                           items:
 *                             type: object
 *       404:
 *         description: Usuário não encontrado
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Listar todos os usuários
 *     tags: [Users]
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
 *         description: Lista de usuários obtida com sucesso
 */

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Atualizar usuário
 *     tags: [Users]
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
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               salt:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: uri
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Usuário atualizado com sucesso
 *       404:
 *         description: Usuário não encontrado
 */

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Deletar usuário (soft delete)
 *     tags: [Users]
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
 *         description: Usuário deletado com sucesso
 *       404:
 *         description: Usuário não encontrado
 */


