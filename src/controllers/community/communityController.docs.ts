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
 *           description: 'Tipo de estrutura do post (ex: poll, text)'
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
 * /api/communities:
 *   get:
 *     summary: Listar comunidades (API v3)
 *     description: Retorna a lista de comunidades usando a API v3 do Amity (/v3/communities). Requer token de autenticação do usuário. Retorna informações sobre as comunidades disponíveis.
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
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número de itens por página
 *         example: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Campo para ordenação (opcional)
 *         example: createdAt
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Incluir comunidades deletadas
 *         example: false
 *     x-code-samples:
 *       - lang: curl
 *         source: |
 *           curl -X GET "{baseUrl}/api/communities?page=1&limit=10&sortBy=createdAt&includeDeleted=false" \
 *             -H "Authorization: Bearer YOUR_TOKEN_HERE"
 *     responses:
 *       200:
 *         description: Comunidades listadas com sucesso
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
 *                     communities:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AmityCommunity'
 *                     paging:
 *                       $ref: '#/components/schemas/AmityPaging'
 *                 message:
 *                   type: string
 *       401:
 *         description: Usuário não autenticado ou token inválido
 *       400:
 *         description: Usuário não está sincronizado com a social.plus
 *       500:
 *         description: Erro ao gerar token de autenticação do usuário ou ao comunicar com a API do Amity
 * /api/communities/feed:
 *   get:
 *     summary: Obter feed do usuário (API v4)
 *     description: Retorna o feed personalizado do usuário autenticado usando a API v4 do Amity (/v4/me/global-feeds). Requer token de autenticação do usuário. Retorna estrutura completa incluindo posts, postChildren, comments, users, files, communities, categories, etc. Os filtros avançados (postTypes, authorIds, startDate, endDate, orderBy, order) são aplicados localmente após buscar os dados da API, permitindo combinação de múltiplos filtros simultaneamente.
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
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número de itens por página
 *         example: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Termo de busca para filtrar posts nos campos de texto (data.text) e título (data.title). A busca é case-insensitive.
 *         example: saúde
 *       - in: query
 *         name: postTypes
 *         schema:
 *           oneOf:
 *             - type: string
 *             - type: array
 *               items:
 *                 type: string
 *         description: Lista de tipos de post (structureType/dataType) para filtrar. Aceita múltiplos valores separados por vírgula ou parâmetros repetidos.
 *         example: poll,text
 *       - in: query
 *         name: authorIds
 *         schema:
 *           oneOf:
 *             - type: string
 *             - type: array
 *               items:
 *                 type: string
 *         description: Lista de IDs de autores (postedUserId) para filtrar. Aceita múltiplos valores separados por vírgula ou parâmetros repetidos.
 *         example: userId1,userId2
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Retorna apenas posts com createdAt maior ou igual à data informada (ISO 8601).
 *         example: '2024-01-01T00:00:00Z'
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Retorna apenas posts com createdAt menor ou igual à data informada (ISO 8601).
 *         example: '2024-12-31T23:59:59Z'
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, reactionsCount]
 *           default: createdAt
 *         description: Campo utilizado para ordenação após os filtros locais.
 *         example: createdAt
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Direção da ordenação.
 *         example: desc
 *     x-code-samples:
 *       - lang: curl
 *         source: |
 *           curl -X GET "{baseUrl}/api/communities/feed?page=1&limit=10&search=saúde&postTypes=poll,text&orderBy=createdAt&order=desc" \
 *             -H "Authorization: Bearer YOUR_TOKEN_HERE"
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
 *     x-code-samples:
 *       - lang: curl
 *         source: |
 *           curl -X GET "{baseUrl}/api/communities/channels?types=conversation" \
 *             -H "Authorization: Bearer YOUR_TOKEN_HERE"
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
 *     x-code-samples:
 *       - lang: curl
 *         source: |
 *           curl -X PUT "{baseUrl}/api/communities/polls/184449157f7705489ae1ef37ae3882501763940362253/votes" \
 *             -H "Authorization: Bearer YOUR_TOKEN_HERE" \
 *             -H "Content-Type: application/json" \
 *             -d '{"answerIds": ["6923980a66ded7913e7222df"]}'
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
 *                 description: 'Nome da reação (padrão: like)'
 *                 example: like
 *     x-code-samples:
 *       - lang: curl
 *         source: |
 *           curl -X POST "{baseUrl}/api/communities/comments/691f87c3c91a311eb23b24e8/reactions" \
 *             -H "Authorization: Bearer YOUR_TOKEN_HERE" \
 *             -H "Content-Type: application/json" \
 *             -d '{"reactionName": "like"}'
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
 *                 description: 'Nome da reação a ser removida (padrão: like)'
 *                 example: like
 *     x-code-samples:
 *       - lang: curl
 *         source: |
 *           curl -X DELETE "{baseUrl}/api/communities/comments/691f87c3c91a311eb23b24e8/reactions" \
 *             -H "Authorization: Bearer YOUR_TOKEN_HERE" \
 *             -H "Content-Type: application/json" \
 *             -d '{"reactionName": "like"}'
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
 * /api/communities/provider/{userId}:
 *   get:
 *     summary: Obter dados não sensíveis do usuário do Social Plus
 *     description: Retorna apenas dados públicos/não sensíveis de um usuário do Social Plus usando a API v3 do Amity (/v3/users/{userId}?type=public). Este endpoint filtra informações sensíveis como permissões, roles internas, flags, etc., retornando apenas dados públicos como displayName, profileHandle, avatar, description, etc.
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário no Social Plus
 *         example: "auth0|123456789"
 *     x-code-samples:
 *       - lang: curl
 *         source: |
 *           curl -X GET "{baseUrl}/api/communities/provider/auth0|123456789" \
 *             -H "Authorization: Bearer YOUR_TOKEN_HERE"
 *     responses:
 *       200:
 *         description: Dados não sensíveis do usuário obtidos com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Dados públicos do usuário (filtrados)
 *                   properties:
 *                     userId:
 *                       type: string
 *                       description: ID do usuário no Social Plus
 *                     displayName:
 *                       type: string
 *                       description: Nome de exibição do usuário
 *                     profileHandle:
 *                       type: string
 *                       description: Handle do perfil do usuário
 *                     description:
 *                       type: string
 *                       description: Descrição/bio do usuário
 *                     avatarCustomUrl:
 *                       type: string
 *                       description: URL customizada do avatar
 *                     avatarFileId:
 *                       type: string
 *                       description: ID do arquivo do avatar
 *                     isBrand:
 *                       type: boolean
 *                       description: Indica se é uma conta de marca
 *                     isDeleted:
 *                       type: boolean
 *                       description: Indica se o usuário foi deletado
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: Data de criação
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: Data de atualização
 *                     files:
 *                       type: array
 *                       description: Arquivos públicos do usuário (apenas avatar público)
 *                       items:
 *                         type: object
 *                         properties:
 *                           fileId:
 *                             type: string
 *                           fileUrl:
 *                             type: string
 *                           type:
 *                             type: string
 *                           accessType:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                 message:
 *                   type: string
 *       400:
 *         description: Erro ao obter dados do usuário (userId inválido ou erro na API)
 *       404:
 *         description: Usuário não encontrado no Social Plus ou dados não disponíveis
 *       401:
 *         description: Usuário não autenticado ou token inválido
 *       500:
 *         description: Erro interno ao comunicar com a API do Social Plus
 */

