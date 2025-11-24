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
 *         structureType:
 *           type: string
 *           description: Tipo de estrutura do post (ex: "poll", "text")
 *         data:
 *           type: object
 *           description: Dados do post (title, text, pollId, etc.)
 *         createdAt:
 *           type: string
 *         updatedAt:
 *           type: string
 *         reactionsCount:
 *           type: integer
 *         commentsCount:
 *           type: integer
 *         pollOptions:
 *           type: array
 *           description: Opções de poll agrupadas (apenas para posts com structureType="poll")
 *           items:
 *             $ref: '#/components/schemas/AmityPost'
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
 *     AmityChannel:
 *       type: object
 *       properties:
 *         channelId:
 *           type: string
 *         displayName:
 *           type: string
 *         description:
 *           type: string
 *         avatarFileId:
 *           type: string
 *         type:
 *           type: string
 *           enum: [conversation, broadcast, live, community]
 *         metadata:
 *           type: object
 *         memberCount:
 *           type: integer
 *         unreadCount:
 *           type: integer
 *         isMuted:
 *           type: boolean
 *         isFlaggedByMe:
 *           type: boolean
 *         createdAt:
 *           type: string
 *         updatedAt:
 *           type: string
 *         lastActivity:
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Termo de busca para filtrar posts nos campos de texto (data.text) e título (data.title). A busca é case-insensitive.
 *       - in: query
 *         name: postTypes
 *         schema:
 *           oneOf:
 *             - type: string
 *             - type: array
 *               items:
 *                 type: string
 *         description: Lista de tipos de post (structureType/dataType) para filtrar. Aceita múltiplos valores separados por vírgula ou parâmetros repetidos.
 *       - in: query
 *         name: authorIds
 *         schema:
 *           oneOf:
 *             - type: string
 *             - type: array
 *               items:
 *                 type: string
 *         description: Lista de IDs de autores (postedUserId) para filtrar. Aceita múltiplos valores separados por vírgula ou parâmetros repetidos.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Retorna apenas posts com createdAt maior ou igual à data informada (ISO 8601).
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Retorna apenas posts com createdAt menor ou igual à data informada (ISO 8601).
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, reactionsCount]
 *           default: createdAt
 *         description: Campo utilizado para ordenação após os filtros locais.
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Direção da ordenação.
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
 * /api/communities/channels:
 *   get:
 *     summary: Obter channels do usuário (SDK)
 *     description: Retorna os channels do usuário autenticado usando o SDK do Amity (ChannelRepository.getChannels). Requer token de autenticação do usuário e que o SDK do Amity esteja inicializado.
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: types
 *         schema:
 *           oneOf:
 *             - type: string
 *               enum: [conversation, broadcast, live, community]
 *             - type: array
 *               items:
 *                 type: string
 *                 enum: [conversation, broadcast, live, community]
 *         description: Filtro opcional para tipos de channels. Pode ser um único tipo ou array de tipos.
 *         example: conversation
 *     responses:
 *       200:
 *         description: Channels obtidos com sucesso
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
 *                     channels:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AmityChannel'
 *                     hasNextPage:
 *                       type: boolean
 *                       description: Indica se há mais páginas disponíveis
 *                     loading:
 *                       type: boolean
 *                       description: Indica se ainda está carregando
 *                     error:
 *                       type: object
 *                       nullable: true
 *                       description: Erro, se houver
 *                 message:
 *                   type: string
 *       401:
 *         description: Usuário não autenticado ou token inválido
 *       400:
 *         description: SDK do Amity não está inicializado ou usuário não está sincronizado com a social.plus
 *       500:
 *         description: Erro ao buscar channels
 * /api/communities/polls/{pollId}/votes:
 *   put:
 *     summary: Votar em poll (API v3)
 *     description: Registra o voto do usuário autenticado em uma poll usando a API v3 do Amity (/v3/polls/{pollId}/votes). Requer token de autenticação do usuário.
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pollId
 *         required: false
 *         schema:
 *           type: string
 *         description: ID da poll (opcional, pode ser enviado no body)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - answerIds
 *             properties:
 *               pollId:
 *                 type: string
 *                 description: ID da poll (obrigatório se não enviado como parâmetro). Este é o pollId real que está em data.pollId das opções, não o postId.
 *                 example: "184449157f7705489ae1ef37ae3882501763940362253"
 *               answerIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array de IDs das respostas selecionadas
 *                 example: ["6923980a66ded7913e7222df"]
 *     responses:
 *       200:
 *         description: Voto registrado com sucesso
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
 *                   description: Dados retornados pela API do Amity
 *                 message:
 *                   type: string
 *       400:
 *         description: Erro na requisição (pollId ou answerIds inválidos)
 *       401:
 *         description: Usuário não autenticado ou token inválido
 *       500:
 *         description: Erro ao processar voto
 * /api/communities/comments/{commentId}/reactions:
 *   post:
 *     summary: Adicionar reação a comentário (REST)
 *     description: Adiciona uma reação a um comentário usando a API REST do Amity (/v3/comments/{commentId}/reactions). Requer token de autenticação do usuário gerado via social.plus.
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do comentário
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reactionName:
 *                 type: string
 *                 default: like
 *                 description: Nome da reação (padrão: "like")
 *                 example: like
 *     responses:
 *       200:
 *         description: Reação adicionada com sucesso
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
 *                     success:
 *                       type: boolean
 *                     message:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Erro na requisição (commentId inválido, usuário não sincronizado ou reação já aplicada)
 *       401:
 *         description: Usuário não autenticado ou token inválido
 *       500:
 *         description: Erro interno ao comunicar com a API REST do Amity
 *   delete:
 *     summary: Remover reação de comentário (REST)
 *     description: Remove uma reação de um comentário usando a API REST do Amity (/v3/comments/{commentId}/reactions/{reactionName}). Requer token de autenticação do usuário gerado via social.plus.
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do comentário
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reactionName:
 *                 type: string
 *                 default: like
 *                 description: Nome da reação a ser removida (padrão: "like")
 *                 example: like
 *     responses:
 *       200:
 *         description: Reação removida com sucesso
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
 *                     success:
 *                       type: boolean
 *                     message:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Erro na requisição (commentId inválido, usuário não sincronizado ou reação inexistente)
 *       401:
 *         description: Usuário não autenticado ou token inválido
 *       500:
 *         description: Erro interno ao comunicar com a API REST do Amity
 */

