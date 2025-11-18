/**
 * @swagger
 * components:
 *   schemas:
 *     Person:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         surname:
 *           type: string
 *         nationalRegistration:
 *           type: string
 *         birthdate:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/persons:
 *   post:
 *     summary: Criar ou atualizar pessoa do usuário autenticado (Create or Update)
 *     description: Cria uma nova pessoa se o usuário não tiver uma associada, ou atualiza a pessoa existente do usuário autenticado. O endpoint identifica automaticamente a pessoa do usuário através do token de autenticação.
 *     tags: [Persons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Primeiro nome
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Último nome
 *               surname:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Sobrenome (opcional)
 *               nationalRegistration:
 *                 type: string
 *                 maxLength: 50
 *                 description: CPF, RG ou outro documento de identificação (opcional)
 *               birthdate:
 *                 type: string
 *                 format: date
 *                 description: Data de nascimento (opcional)
 *     responses:
 *       200:
 *         description: Pessoa atualizada com sucesso (quando já existe)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Person'
 *                 message:
 *                   type: string
 *       201:
 *         description: Pessoa criada com sucesso (quando não existia)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Person'
 *                 message:
 *                   type: string
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Usuário não autenticado
 *       404:
 *         description: Usuário não encontrado
 */

/**
 * @swagger
 * /api/persons/{id}:
 *   get:
 *     summary: Obter pessoa por ID
 *     tags: [Persons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da pessoa
 *     responses:
 *       200:
 *         description: Pessoa obtida com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Person'
 *                 message:
 *                   type: string
 *       404:
 *         description: Pessoa não encontrada
 */

/**
 * @swagger
 * /api/persons:
 *   get:
 *     summary: Listar todas as pessoas
 *     tags: [Persons]
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
 *         description: Limite de itens por página
 *     responses:
 *       200:
 *         description: Lista de pessoas obtida com sucesso
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
 *                     persons:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Person'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/persons/{id}:
 *   put:
 *     summary: Atualizar pessoa
 *     tags: [Persons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da pessoa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               surname:
 *                 type: string
 *               nationalRegistration:
 *                 type: string
 *               birthdate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Pessoa atualizada com sucesso
 *       404:
 *         description: Pessoa não encontrada
 */

/**
 * @swagger
 * /api/persons/{id}:
 *   delete:
 *     summary: Deletar pessoa (soft delete)
 *     tags: [Persons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da pessoa
 *     responses:
 *       200:
 *         description: Pessoa deletada com sucesso
 *       404:
 *         description: Pessoa não encontrada
 */

