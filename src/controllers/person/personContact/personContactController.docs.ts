/**
 * @swagger
 * components:
 *   schemas:
 *     PersonContact:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         personId:
 *           type: string
 *         type:
 *           type: string
 *           enum: [email, phone, whatsapp, other]
 *         value:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/person-contacts:
 *   post:
 *     summary: Criar um novo contato de pessoa
 *     tags: [PersonContacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - personId
 *               - type
 *               - value
 *             properties:
 *               personId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [email, phone, whatsapp, other]
 *               value:
 *                 type: string
 *     responses:
 *       201:
 *         description: Contato criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PersonContact'
 *                 message:
 *                   type: string
 *       400:
 *         description: Dados inválidos
 */

/**
 * @swagger
 * /api/person-contacts/{id}:
 *   get:
 *     summary: Obter contato por ID
 *     tags: [PersonContacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do contato
 *     responses:
 *       200:
 *         description: Contato obtido com sucesso
 *       404:
 *         description: Contato não encontrado
 */

/**
 * @swagger
 * /api/person-contacts:
 *   get:
 *     summary: Listar todos os contatos
 *     tags: [PersonContacts]
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
 *         name: personId
 *         schema:
 *           type: string
 *         description: Filtrar por ID da pessoa
 *     responses:
 *       200:
 *         description: Lista de contatos obtida com sucesso
 */

/**
 * @swagger
 * /api/person-contacts/{id}:
 *   put:
 *     summary: Atualizar contato
 *     tags: [PersonContacts]
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
 *               type:
 *                 type: string
 *                 enum: [email, phone, whatsapp, other]
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contato atualizado com sucesso
 *       404:
 *         description: Contato não encontrado
 */

/**
 * @swagger
 * /api/person-contacts/{id}:
 *   delete:
 *     summary: Deletar contato (soft delete)
 *     tags: [PersonContacts]
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
 *         description: Contato deletado com sucesso
 *       404:
 *         description: Contato não encontrado
 */

