/**
 * @swagger
 * components:
 *   schemas:
 *     AuthResponse:
 *       type: object
 *       properties:
 *         user:
 *           $ref: '#/components/schemas/User'
 *         token:
 *           type: string
 *         registerCompletedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Data em que o registro foi completado (calculado - true se houver dados adicionais na Person)
 *         objectivesSelectedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Data em que os objetivos foram selecionados (calculado - true se houver objetivos em UserPersonalObjective)
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         username:
 *           type: string
 *         avatar:
 *           type: string
 *         isActive:
 *           type: boolean
 *         person:
 *           $ref: '#/components/schemas/Person'
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar novo usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               surname:
 *                 type: string
 *               phone:
 *                 type: string
 *               birthdate:
 *                 type: string
 *                 format: date
 *               avatar:
 *                 type: string
 *                 format: uri
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AuthResponse'
 *                 message:
 *                   type: string
 *       409:
 *         description: Usuário ou email já existe
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login com Auth0
 *     description: Valida o idToken do Auth0 e retorna token de sessão do backend. O idToken pode ser enviado no body ou no header Authorization (Bearer token).
 *     tags: [Auth]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Token JWT do Auth0 (idToken). Opcional se enviado no header Authorization.
 *               user:
 *                 type: object
 *                 description: Informações adicionais do usuário do Auth0 (opcional)
 *                 properties:
 *                   email:
 *                     type: string
 *                   name:
 *                     type: string
 *                   picture:
 *                     type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/AuthResponse'
 *                     - type: object
 *                       properties:
 *                         registerCompletedAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                           description: Data em que o registro foi completado (null se não completado)
 *                         objectivesSelectedAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                           description: Data em que os objetivos foram selecionados (null se não selecionados)
 *                 message:
 *                   type: string
 *       400:
 *         description: Token inválido ou ausente
 *       401:
 *         description: Token do Auth0 inválido
 */

/**
 * @swagger
 * /api/auth/auth-url:
 *   get:
 *     summary: Obter URL de autorização do Auth0 (Authorization Code Flow)
 *     description: Retorna a URL para redirecionar o usuário ao Auth0 para fazer login usando o Authorization Code Flow. Este é o método recomendado e mais seguro para produção. Após o login, o usuário será redirecionado para /api/auth/callback com um código que pode ser trocado por tokens.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Valor opcional para prevenir CSRF attacks
 *     responses:
 *       200:
 *         description: URL de autorização gerada com sucesso
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
 *                     authUrl:
 *                       type: string
 *                       format: uri
 *                       description: URL para redirecionar o usuário ao Auth0
 *                     redirectUri:
 *                       type: string
 *                       description: URI de callback configurada
 *                     state:
 *                       type: string
 *                       description: Valor de state gerado
 *                     instructions:
 *                       type: string
 *                 message:
 *                   type: string
 *       500:
 *         description: Auth0 não configurado corretamente
 */

/**
 * @swagger
 * /api/auth/callback:
 *   get:
 *     summary: Callback do Auth0 (Authorization Code Flow)
 *     description: Endpoint de callback que recebe o código de autorização do Auth0 após o login. Este endpoint troca o código por tokens e retorna uma página HTML com o idToken para copiar e usar no Swagger.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Código de autorização retornado pelo Auth0
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Valor de state enviado na requisição inicial
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *         description: Erro retornado pelo Auth0 (se houver)
 *     responses:
 *       200:
 *         description: Página HTML com o idToken para copiar
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       400:
 *         description: Código não fornecido ou erro na autorização
 *       500:
 *         description: Erro ao processar callback
 */

/**
 * @swagger
 * /api/auth/exchange-code:
 *   post:
 *     summary: Trocar código de autorização por tokens (Authorization Code Flow)
 *     description: Troca o código de autorização retornado pelo Auth0 por tokens (idToken, accessToken). Use este endpoint se preferir receber os tokens via JSON ao invés da página HTML do callback.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Código de autorização retornado pelo Auth0 após o login
 *     responses:
 *       200:
 *         description: Tokens obtidos com sucesso
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
 *                     idToken:
 *                       type: string
 *                       description: Token JWT do Auth0 (idToken) - use este token no Swagger Authorize
 *                     accessToken:
 *                       type: string
 *                       description: Access token do Auth0
 *                     tokenType:
 *                       type: string
 *                       description: Tipo do token (geralmente "Bearer")
 *                     expiresIn:
 *                       type: integer
 *                       description: Tempo de expiração em segundos
 *                 message:
 *                   type: string
 *       400:
 *         description: Código não fornecido
 *       401:
 *         description: Código inválido ou expirado
 *       500:
 *         description: Auth0 não configurado corretamente
 */

/**
 * @swagger
 * /api/auth/verify:
 *   post:
 *     summary: Verificar idToken do Auth0 e obter token de sessão
 *     description: Valida o idToken do Auth0 e retorna token de sessão do backend. Diferente do login, este endpoint não cria usuário automaticamente - o usuário deve estar previamente cadastrado. O idToken pode ser enviado no body ou no header Authorization (Bearer token).
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Token JWT do Auth0 (idToken). Também pode ser enviado no header Authorization (Bearer token).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token verificado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AuthResponse'
 *                 message:
 *                   type: string
 *       400:
 *         description: Token inválido ou ausente, ou email não encontrado no token
 *       401:
 *         description: Token do Auth0 inválido ou expirado, ou usuário inativo/deletado
 *       404:
 *         description: Usuário não encontrado. Faça o registro primeiro.
 */

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Obter perfil do usuário autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *       401:
 *         description: Não autenticado
 */

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Atualizar perfil do usuário autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               surname:
 *                 type: string
 *               birthdate:
 *                 type: string
 *                 format: date
 *               avatar:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Perfil atualizado com sucesso
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Usuário não encontrado
 */

/**
 * @swagger
 * /api/auth/account:
 *   delete:
 *     summary: Deletar conta do usuário autenticado (soft delete)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conta desativada com sucesso
 *       401:
 *         description: Não autenticado
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout do usuário
 *     description: Invalida a sessão do usuário (opcional, token será invalidado no frontend)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 *       401:
 *         description: Não autenticado
 */

