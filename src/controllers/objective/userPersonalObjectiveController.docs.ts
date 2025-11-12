/**
 * @swagger
 * /api/user-personal-objectives:
 *   post:
 *     summary: Criar relação entre usuário e objetivo pessoal
 *     tags: [UserPersonalObjectives]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - objectiveId
 *             properties:
 *               userId:
 *                 type: string
 *               objectiveId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Relação criada com sucesso
 *       404:
 *         description: Usuário ou objetivo não encontrado
 *       409:
 *         description: Usuário já possui este objetivo
 */

/**
 * @swagger
 * /api/user-personal-objectives/{userId}/{objectiveId}:
 *   get:
 *     summary: Obter relação entre usuário e objetivo pessoal
 *     tags: [UserPersonalObjectives]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: objectiveId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Relação obtida com sucesso
 *       404:
 *         description: Relação não encontrada
 */

/**
 * @swagger
 * /api/user-personal-objectives:
 *   get:
 *     summary: Listar todas as relações entre usuários e objetivos pessoais
 *     tags: [UserPersonalObjectives]
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
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: objectiveId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de relações obtida com sucesso
 */

/**
 * @swagger
 * /api/user-personal-objectives/{userId}/{objectiveId}:
 *   delete:
 *     summary: Deletar relação entre usuário e objetivo pessoal (soft delete)
 *     tags: [UserPersonalObjectives]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: objectiveId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Relação deletada com sucesso
 *       404:
 *         description: Relação não encontrada
 */

/**
 * @swagger
 * /api/user-personal-objectives/me/objectives:
 *   get:
 *     summary: Obter objetivos do usuário autenticado
 *     tags: [UserPersonalObjectives]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Objetivos do usuário obtidos com sucesso
 */

/**
 * @swagger
 * /api/user-personal-objectives/me/objectives:
 *   post:
 *     summary: Adicionar objetivo ao usuário autenticado
 *     tags: [UserPersonalObjectives]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - objectiveId
 *             properties:
 *               objectiveId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Objetivo adicionado com sucesso
 *       404:
 *         description: Objetivo não encontrado
 *       409:
 *         description: Usuário já possui este objetivo
 */

/**
 * @swagger
 * /api/user-personal-objectives/me/objectives/{objectiveId}:
 *   delete:
 *     summary: Remover objetivo do usuário autenticado
 *     tags: [UserPersonalObjectives]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: objectiveId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Objetivo removido com sucesso
 *       404:
 *         description: Objetivo não encontrado
 */

