/**
 * @swagger
 * components:
 *   schemas:
 *     Activity:
 *       type: object
 *       required:
 *         - name
 *         - type
 *         - startDate
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the activity
 *         userId:
 *           type: string
 *           format: uuid
 *           description: ID of the user who owns the activity
 *         name:
 *           type: string
 *           maxLength: 200
 *           description: Name of the activity
 *         type:
 *           type: string
 *           enum: [task, event]
 *           description: Type of activity (task or event)
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: Start date and time of the activity
 *         startTime:
 *           type: string
 *           maxLength: 20
 *           description: Start time of the activity (optional, e.g., "8:00 AM")
 *         endDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: End date and time of the activity (optional, mainly for events)
 *         endTime:
 *           type: string
 *           maxLength: 20
 *           nullable: true
 *           description: End time of the activity (optional, e.g., "9:00 AM")
 *         location:
 *           type: string
 *           maxLength: 500
 *           nullable: true
 *           description: Location where the activity takes place
 *         reminderEnabled:
 *           type: boolean
 *           default: false
 *           description: Whether the reminder is enabled
 *         reminderOffset:
 *           type: string
 *           maxLength: 50
 *           nullable: true
 *           description: Reminder offset (e.g., "5 min before", "10 min after")
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 * /api/activities:
 *   post:
 *     tags: [Activities]
 *     summary: Create a new activity
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
 *               - type
 *               - startDate
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 example: "Team Meeting"
 *               type:
 *                 type: string
 *                 enum: [task, event]
 *                 example: "event"
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-10-17T08:00:00Z"
 *               startTime:
 *                 type: string
 *                 example: "8:00 AM"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 example: "2024-10-17T09:00:00Z"
 *               endTime:
 *                 type: string
 *                 nullable: true
 *                 example: "9:00 AM"
 *               location:
 *                 type: string
 *                 nullable: true
 *                 example: "Vibre Saúde, Pinheiros, 142"
 *               reminderEnabled:
 *                 type: boolean
 *                 example: true
 *               reminderOffset:
 *                 type: string
 *                 nullable: true
 *                 example: "5 min before"
 *     responses:
 *       201:
 *         description: Activity created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Activity created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Activity'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *
 *   get:
 *     tags: [Activities]
 *     summary: Get all activities for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [task, event]
 *         description: Filter by activity type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter activities starting from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter activities ending before this date
 *     responses:
 *       200:
 *         description: List of activities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Activities retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     activities:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Activity'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *
 * /api/activities/{id}:
 *   get:
 *     tags: [Activities]
 *     summary: Get an activity by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Activity ID
 *     responses:
 *       200:
 *         description: Activity retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Activity retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Activity'
 *       404:
 *         description: Activity not found
 *       403:
 *         description: Not authorized to view this activity
 *
 *   put:
 *     tags: [Activities]
 *     summary: Update an activity
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Activity ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *               type:
 *                 type: string
 *                 enum: [task, event]
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               startTime:
 *                 type: string
 *                 nullable: true
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               endTime:
 *                 type: string
 *                 nullable: true
 *               location:
 *                 type: string
 *                 nullable: true
 *               reminderEnabled:
 *                 type: boolean
 *               reminderOffset:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Activity updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Activity updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Activity'
 *       404:
 *         description: Activity not found
 *       403:
 *         description: Not authorized to update this activity
 *
 *   delete:
 *     tags: [Activities]
 *     summary: Delete an activity (soft delete)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Activity ID
 *     responses:
 *       200:
 *         description: Activity deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Activity deleted successfully"
 *                 data:
 *                   type: null
 *       404:
 *         description: Activity not found
 *       403:
 *         description: Not authorized to delete this activity
 */
