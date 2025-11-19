/**
 * @swagger
 * components:
 *   schemas:
 *     Community:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         type:
 *           type: string
 *           enum: [public, private, official, unofficial]
 *         avatar:
 *           type: string
 *           format: uri
 *         socialPlusCommunityId:
 *           type: string
 *         createdBy:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CommunityMember:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         communityId:
 *           type: string
 *         role:
 *           type: string
 *           enum: [member, admin, moderator]
 *         createdAt:
 *           type: string
 *           format: date-time
 *     Pagination:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 *         total:
 *           type: integer
 *         totalPages:
 *           type: integer
 */

/**
 * @swagger
 * /api/communities:
 *   get:
 *     summary: Listar todas as comunidades
 *     tags: [Communities]
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [public, private, official, unofficial]
 *     responses:
 *       200:
 *         description: Lista de comunidades obtida com sucesso
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
 *                     communities:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Community'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                 message:
 *                   type: string
 *       401:
 *         description: Usuário não autenticado
 */

/**
 * @swagger
 * /api/communities/user/me:
 *   get:
 *     summary: Listar comunidades do usuário autenticado
 *     description: Retorna todas as comunidades que o usuário autenticado está participando, incluindo seu papel (role) e data de entrada
 *     tags: [Communities]
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
 *         description: Lista de comunidades do usuário obtida com sucesso
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
 *                     communities:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/Community'
 *                           - type: object
 *                             properties:
 *                               role:
 *                                 type: string
 *                                 enum: [member, admin, moderator]
 *                                 description: Papel do usuário na comunidade
 *                               joinedAt:
 *                                 type: string
 *                                 format: date-time
 *                                 description: Data em que o usuário entrou na comunidade
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                 message:
 *                   type: string
 *       401:
 *         description: Usuário não autenticado
 */

/**
 * @swagger
 * /api/communities/{id}:
 *   get:
 *     summary: Obter comunidade por ID
 *     tags: [Communities]
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
 *         description: Comunidade obtida com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Community'
 *                 message:
 *                   type: string
 *       404:
 *         description: Comunidade não encontrada
 */

/**
 * @swagger
 * /api/communities/{id}/members:
 *   post:
 *     summary: Adicionar membro à comunidade
 *     tags: [Communities]
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
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [member, admin, moderator]
 *                 default: member
 *     responses:
 *       201:
 *         description: Membro adicionado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CommunityMember'
 *                 message:
 *                   type: string
 *       404:
 *         description: Comunidade ou usuário não encontrado
 *       403:
 *         description: Sem permissão para adicionar membros
 *       409:
 *         description: Usuário já é membro desta comunidade
 */

/**
 * @swagger
 * /api/communities/{id}/members/{userId}:
 *   delete:
 *     summary: Remover membro da comunidade
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Membro removido com sucesso
 *       404:
 *         description: Comunidade ou membro não encontrado
 *       403:
 *         description: Sem permissão para remover membros
 */

/**
 * @swagger
 * /api/communities/{id}/members:
 *   get:
 *     summary: Listar membros da comunidade
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *         description: Lista de membros obtida com sucesso
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
 *                     members:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CommunityMember'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/communities/user/me/posts:
 *   get:
 *     summary: Listar posts das comunidades do usuário autenticado
 *     description: Retorna todos os posts das comunidades que o usuário autenticado está participando, ordenados por data (mais recente primeiro) com paginação
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número de itens por página
 *     responses:
 *       200:
 *         description: Posts das comunidades obtidos com sucesso
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
 *                     posts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: ID do post no social.plus
 *                           communityId:
 *                             type: string
 *                             description: ID da comunidade no social.plus
 *                           userId:
 *                             type: string
 *                             description: ID do usuário que criou o post
 *                           content:
 *                             type: string
 *                             description: Conteúdo do post
 *                           media:
 *                             type: array
 *                             items:
 *                               type: string
 *                             description: URLs de mídia do post
 *                           metadata:
 *                             type: object
 *                             description: Metadados adicionais do post
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             description: Data de criação do post
 *                     postChildren:
 *                       type: array
 *                       description: Subposts retornados pela social.plus
 *                       items:
 *                         type: object
 *                     comments:
 *                       type: array
 *                       description: Comentários retornados pela social.plus
 *                       items:
 *                         type: object
 *                     users:
 *                       type: array
 *                       description: Usuários relacionados ao feed
 *                       items:
 *                         type: object
 *                     communities:
 *                       type: array
 *                       description: Comunidades relacionadas ao feed
 *                       items:
 *                         type: object
 *                     paging:
 *                       type: object
 *                       description: Cursor de paginação retornado pela social.plus
 *                       properties:
 *                         next:
 *                           type: string
 *                         previous:
 *                           type: string
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                 message:
 *                   type: string
 *       401:
 *         description: Usuário não autenticado
 */

/**
 * @swagger
 * /api/communities/public/posts:
 *   get:
 *     summary: Listar posts públicos (global feed)
 *     description: Retorna o feed público/global diretamente da social.plus (Amity), incluindo posts, comentários, usuários e metadados
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número de itens por página
 *     responses:
 *       200:
 *         description: Feed público obtido com sucesso
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
 *                     posts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: ID do post no social.plus
 *                           communityId:
 *                             type: string
 *                             description: ID da comunidade no social.plus
 *                           userId:
 *                             type: string
 *                             description: ID do usuário que criou o post
 *                           content:
 *                             type: string
 *                             description: Conteúdo do post
 *                           media:
 *                             type: array
 *                             items:
 *                               type: string
 *                             description: URLs de mídia do post
 *                           metadata:
 *                             type: object
 *                             description: Metadados adicionais do post
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             description: Data de criação do post
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                 message:
 *                   type: string
 */

