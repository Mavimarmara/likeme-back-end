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
 *                   $ref: '#/components/schemas/AuthResponse'
 *                 message:
 *                   type: string
 *       400:
 *         description: Token inválido ou ausente
 *       401:
 *         description: Token do Auth0 inválido
 */

/**
 * @swagger
 * /api/auth/idtoken:
 *   post:
 *     summary: Obter idToken do Auth0
 *     description: Autentica com Auth0 usando email e senha, e retorna o idToken. Este endpoint é útil para obter o idToken que pode ser usado no Swagger UI (botão Authorize) ou em outros endpoints que requerem autenticação Auth0.
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
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email do usuário no Auth0
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Senha do usuário no Auth0
 *     responses:
 *       200:
 *         description: idToken obtido com sucesso
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
 *         description: Email ou senha não fornecidos
 *       401:
 *         description: Credenciais inválidas
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

