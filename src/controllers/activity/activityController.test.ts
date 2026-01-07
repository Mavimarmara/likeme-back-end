import request from 'supertest';
import app from '@/server';
import prisma from '@/config/database';
import { safeTestCleanup, TestDataTracker, createTestToken, generateTestId, TEST_ID_PREFIX } from '@/utils/test-helpers';

jest.setTimeout(30000);

const testDataTracker = new TestDataTracker();

beforeAll(async () => {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  NODE_ENV não está definido como "test". Os testes podem afetar o banco de dados de desenvolvimento!');
  }
});

afterAll(async () => {
  await safeTestCleanup(testDataTracker, prisma);
  await prisma.$disconnect();
});

afterEach(async () => {
  jest.restoreAllMocks();
});

describe('Activity Endpoints', () => {
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    authToken = await createTestToken(prisma, testDataTracker);
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'test-secret') as { userId: string };
    testUser = await prisma.user.findUnique({ where: { id: decoded.userId } });
  });

  describe('POST /api/activities', () => {
    it('should create a new task activity', async () => {
      const activityData = {
        name: 'Complete project',
        type: 'task',
        startDate: new Date('2024-10-17T08:00:00Z'),
        startTime: '8:00 AM',
        reminderEnabled: true,
        reminderOffset: '15 min before',
      };

      const response = await request(app)
        .post('/api/activities')
        .send(activityData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(activityData.name);
      expect(response.body.data.type).toBe('task');
      
      if (response.body.data?.id) {
        testDataTracker.add('activity', response.body.data.id);
      }
    });

    it('should create a new event activity', async () => {
      const activityData = {
        name: 'Team Meeting',
        type: 'event',
        startDate: new Date('2024-10-17T08:00:00Z'),
        startTime: '8:00 AM',
        endDate: new Date('2024-10-17T09:00:00Z'),
        endTime: '9:00 AM',
        location: 'Vibre Saúde, Pinheiros, 142',
        reminderEnabled: true,
        reminderOffset: '5 min before',
      };

      const response = await request(app)
        .post('/api/activities')
        .send(activityData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(activityData.name);
      expect(response.body.data.type).toBe('event');
      expect(response.body.data.location).toBe(activityData.location);
      expect(response.body.data.endDate).toBeDefined();
      
      if (response.body.data?.id) {
        testDataTracker.add('activity', response.body.data.id);
      }
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/activities')
        .send({})
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 if token is missing', async () => {
      const response = await request(app)
        .post('/api/activities')
        .send({
          name: 'Test',
          type: 'task',
          startDate: new Date(),
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/activities', () => {
    it('should list all activities for authenticated user', async () => {
      const activityId = generateTestId();
      const activity = await prisma.activity.create({
        data: {
          id: activityId,
          userId: testUser!.id,
          name: `Test Activity${TEST_ID_PREFIX}`,
          type: 'task',
          startDate: new Date(),
        },
      });
      testDataTracker.add('activity', activity.id);

      const response = await request(app)
        .get('/api/activities')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activities).toBeDefined();
      expect(Array.isArray(response.body.data.activities)).toBe(true);
    });

    it('should filter activities by type', async () => {
      const eventActivityId = generateTestId();
      const eventActivity = await prisma.activity.create({
        data: {
          id: eventActivityId,
          userId: testUser!.id,
          name: `Test Event${TEST_ID_PREFIX}`,
          type: 'event',
          startDate: new Date(),
        },
      });
      testDataTracker.add('activity', eventActivity.id);

      const response = await request(app)
        .get('/api/activities?type=event')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      if (response.body.data.activities.length > 0) {
        expect(response.body.data.activities.every((a: any) => a.type === 'event')).toBe(true);
      }
    });
  });

  describe('GET /api/activities/:id', () => {
    it('should get activity by id', async () => {
      const activityId = generateTestId();
      const activity = await prisma.activity.create({
        data: {
          id: activityId,
          userId: testUser!.id,
          name: `Test Activity${TEST_ID_PREFIX}`,
          type: 'task',
          startDate: new Date(),
        },
      });
      testDataTracker.add('activity', activity.id);

      const response = await request(app)
        .get(`/api/activities/${activity.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(activity.id);
    });

    it('should return 404 if activity not found', async () => {
      const response = await request(app)
        .get('/api/activities/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 if user does not own activity', async () => {
      const otherPersonId = generateTestId();
      const otherPerson = await prisma.person.create({
        data: { 
          id: otherPersonId,
          firstName: 'Other', 
          lastName: 'User' 
        },
      });
      testDataTracker.add('person', otherPerson.id);

      const otherUserId = generateTestId();
      const otherUser = await prisma.user.create({
        data: {
          id: otherUserId,
          personId: otherPerson.id,
          username: `other${Date.now()}${TEST_ID_PREFIX}@example.com`,
          password: 'hashed',
          isActive: true,
        },
      });
      testDataTracker.add('user', otherUser.id);

      const activityId = generateTestId();
      const activity = await prisma.activity.create({
        data: {
          id: activityId,
          userId: otherUser.id,
          name: `Other User Activity${TEST_ID_PREFIX}`,
          type: 'task',
          startDate: new Date(),
        },
      });
      testDataTracker.add('activity', activity.id);

      const response = await request(app)
        .get(`/api/activities/${activity.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/activities/:id', () => {
    it('should update activity', async () => {
      const activityId = generateTestId();
      const activity = await prisma.activity.create({
        data: {
          id: activityId,
          userId: testUser!.id,
          name: `Original Name${TEST_ID_PREFIX}`,
          type: 'task',
          startDate: new Date(),
        },
      });
      testDataTracker.add('activity', activity.id);

      const response = await request(app)
        .put(`/api/activities/${activity.id}`)
        .send({
          name: 'Updated Name',
          location: 'New Location',
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.data.location).toBe('New Location');
    });

    it('should return 404 if activity not found', async () => {
      const response = await request(app)
        .put('/api/activities/non-existent-id')
        .send({ name: 'Updated' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/activities/:id', () => {
    it('should soft delete activity', async () => {
      const activityId = generateTestId();
      const activity = await prisma.activity.create({
        data: {
          id: activityId,
          userId: testUser!.id,
          name: `Activity to Delete${TEST_ID_PREFIX}`,
          type: 'task',
          startDate: new Date(),
        },
      });
      testDataTracker.add('activity', activity.id);

      const response = await request(app)
        .delete(`/api/activities/${activity.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const deletedActivity = await prisma.activity.findUnique({
        where: { id: activity.id },
      });
      expect(deletedActivity?.deletedAt).toBeDefined();
    });

    it('should return 404 if activity not found', async () => {
      const response = await request(app)
        .delete('/api/activities/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
