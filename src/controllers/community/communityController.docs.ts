/**
 * @swagger
 * components:
 *   schemas:
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
 *     AmityPaging:
 *       type: object
 *       properties:
 *         next:
 *           type: string
 *         previous:
 *           type: string
 *     AmityPost:
 *       type: object
 *       properties:
 *         postId:
 *           type: string
 *         parentPostId:
 *           type: string
 *         postedUserId:
 *           type: string
 *         targetId:
 *           type: string
 *         targetType:
 *           type: string
 *           enum: [user, community]
 *         data:
 *           type: object
 *         createdAt:
 *           type: string
 *         updatedAt:
 *           type: string
 *         reactionsCount:
 *           type: integer
 *         commentsCount:
 *           type: integer
 *     AmityComment:
 *       type: object
 *       properties:
 *         commentId:
 *           type: string
 *         userId:
 *           type: string
 *         referenceId:
 *           type: string
 *         data:
 *           type: object
 *         createdAt:
 *           type: string
 *         updatedAt:
 *           type: string
 *         reactionsCount:
 *           type: integer
 *     AmityUser:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *         displayName:
 *           type: string
 *         avatarFileId:
 *           type: string
 *         createdAt:
 *           type: string
 *         updatedAt:
 *           type: string
 *     AmityFile:
 *       type: object
 *       properties:
 *         fileId:
 *           type: string
 *         fileUrl:
 *           type: string
 *         type:
 *           type: string
 *         createdAt:
 *           type: string
 *         updatedAt:
 *           type: string
 *     AmityCommunity:
 *       type: object
 *       properties:
 *         communityId:
 *           type: string
 *         displayName:
 *           type: string
 *         description:
 *           type: string
 *         avatarFileId:
 *           type: string
 *         isPublic:
 *           type: boolean
 *         membersCount:
 *           type: integer
 *         postsCount:
 *           type: integer
 *         createdAt:
 *           type: string
 *         updatedAt:
 *           type: string
 *     AmityCommunityUser:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *         communityId:
 *           type: string
 *         communityMembership:
 *           type: string
 *         roles:
 *           type: array
 *           items:
 *             type: string
 *         createdAt:
 *           type: string
 *         updatedAt:
 *           type: string
 *     AmityCategory:
 *       type: object
 *       properties:
 *         categoryId:
 *           type: string
 *         name:
 *           type: string
 *         avatarFileId:
 *           type: string
 *         createdAt:
 *           type: string
 *         updatedAt:
 *           type: string
 */

/**
 * @swagger
 * /api/communities/feed:
 *   get:
 *     summary: Obter feed do usuário (API v4)
 *     description: Retorna o feed personalizado do usuário autenticado usando a API v4 do Amity (/v4/me/global-feeds). Requer token de autenticação do usuário. Retorna estrutura completa incluindo posts, postChildren, comments, users, files, communities, categories, etc.
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

