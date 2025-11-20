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
 *     summary: Listar todas as comunidades (API v3)
 *     description: Retorna todas as comunidades usando a API v3 do Amity com autenticação Bearer token. Retorna estrutura completa incluindo communities, users, files, categories, etc.
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
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Campo para ordenação (ex: displayName, createdAt)
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Incluir comunidades deletadas
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
 *                         type: object
 *                     communityUsers:
 *                       type: array
 *                       items:
 *                         type: object
 *                     files:
 *                       type: array
 *                       items:
 *                         type: object
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                     feeds:
 *                       type: array
 *                       items:
 *                         type: object
 *                     paging:
 *                       type: object
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
 * /api/communities/feed:
 *   get:
 *     summary: Obter feed de conteúdo do usuário - posts aos quais tem acesso (API v3)
 *     description: Retorna posts aos quais o usuário autenticado tem acesso (incluindo posts públicos e de comunidades que participa) usando a API v3 do Amity (/v3/content-feeds). Requer token de autenticação do usuário. Retorna estrutura completa incluindo posts, postChildren, comments, users, files, communities, categories, videoStreamings, polls, etc.
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
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Campo para ordenação
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Incluir posts deletados
 *       - in: query
 *         name: targetType
 *         schema:
 *           type: string
 *         description: Filtrar por tipo de target (ex: user, community)
 *       - in: query
 *         name: targetId
 *         schema:
 *           type: string
 *         description: Filtrar por ID do target
 *     responses:
 *       200:
 *         description: Posts do usuário obtidos com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                 posts:
 *                   type: array
 *                   items:
 *                     type: object
 *                 postChildren:
 *                   type: array
 *                   items:
 *                     type: object
 *                 comments:
 *                   type: array
 *                   items:
 *                     type: object
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                 files:
 *                   type: array
 *                   items:
 *                     type: object
 *                 communities:
 *                   type: array
 *                   items:
 *                     type: object
 *                 communityUsers:
 *                   type: array
 *                   items:
 *                     type: object
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                 feeds:
 *                   type: array
 *                   items:
 *                     type: object
 *                 videoStreamings:
 *                   type: array
 *                   items:
 *                     type: object
 *                 videoStreamingChildren:
 *                   type: array
 *                   items:
 *                     type: object
 *                 polls:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 message:
 *                   type: string
 *       401:
 *         description: Usuário não autenticado ou token inválido
 *       400:
 *         description: Usuário não está sincronizado com a social.plus
 *       500:
 *         description: Erro ao gerar token de autenticação do usuário
 */

/**
 * @swagger
 * /api/communities/posts:
 *   get:
 *     summary: Listar feed global do usuário (API v5)
 *     description: Retorna o feed personalizado do usuário autenticado usando a API v5 do Amity (/v5/me/global-feeds). Requer token de autenticação do usuário. Retorna estrutura completa incluindo posts, postChildren, comments, users, files, communities, categories, etc.
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
 *         description: Feed do usuário obtido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     posts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AmityPost'
 *                     postChildren:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AmityPost'
 *                     comments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AmityComment'
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AmityUser'
 *                     files:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AmityFile'
 *                     communities:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AmityCommunity'
 *                     communityUsers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AmityCommunityUser'
 *                     categories:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AmityCategory'
 *                     paging:
 *                       $ref: '#/components/schemas/AmityPaging'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 message:
 *                   type: string
 *       401:
 *         description: Usuário não autenticado ou token inválido
 *       400:
 *         description: Usuário não está sincronizado com a social.plus
 *       500:
 *         description: Erro ao gerar token de autenticação do usuário
 */

