/**
 * @swagger
 * components:
 *   schemas:
 *     PersonalObjective:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         order:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/personal-objectives:
 *   post:
 *     summary: Criar um novo objetivo pessoal
 *     tags: [PersonalObjectives]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               order:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Objetivo pessoal criado com sucesso
 *       409:
 *         description: Objetivo com este nome já existe
 */

/**
 * @swagger
 * /api/personal-objectives/{id}:
 *   get:
 *     summary: Obter objetivo pessoal por ID
 *     tags: [PersonalObjectives]
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
 *         description: Objetivo pessoal obtido com sucesso
 *       404:
 *         description: Objetivo pessoal não encontrado
 */

/**
 * @swagger
 * /api/personal-objectives:
 *   get:
 *     summary: Listar todos os objetivos pessoais
 *     tags: [PersonalObjectives]
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
 *         description: Lista de objetivos pessoais obtida com sucesso
 */

/**
 * @swagger
 * /api/personal-objectives/{id}:
 *   put:
 *     summary: Atualizar objetivo pessoal
 *     tags: [PersonalObjectives]
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               order:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Objetivo pessoal atualizado com sucesso
 *       404:
 *         description: Objetivo pessoal não encontrado
 *       409:
 *         description: Objetivo com este nome já existe
 */

/**
 * @swagger
 * /api/personal-objectives/{id}:
 *   delete:
 *     summary: Deletar objetivo pessoal (soft delete)
 *     tags: [PersonalObjectives]
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
 *         description: Objetivo pessoal deletado com sucesso
 *       404:
 *         description: Objetivo pessoal não encontrado
 */

