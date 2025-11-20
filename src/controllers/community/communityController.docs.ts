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
 * /api/communities/feed:
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

