import { activityService } from '@/services/activity/activityService';
import prisma from '@/config/database';
import { safeTestCleanup, TestDataTracker } from '@/utils/test-helpers';

jest.setTimeout(30000);

const testDataTracker = new TestDataTracker();

afterAll(async () => {
  await safeTestCleanup(testDataTracker, prisma);
  await prisma.$disconnect();
});

describe('ActivityService', () => {
  let testUser: any;
  let testActivity: any;

  beforeEach(async () => {
    const person = await prisma.person.create({
      data: { firstName: 'Test', lastName: 'User' },
    });
    testDataTracker.add('person', person.id);

    testUser = await prisma.user.create({
      data: {
        personId: person.id,
        username: `test${Date.now()}@example.com`,
        password: 'hashed',
        isActive: true,
      },
    });
    testDataTracker.add('user', testUser.id);

    testActivity = await prisma.activity.create({
      data: {
        userId: testUser.id,
        name: 'Test Activity',
        type: 'task',
        startDate: new Date(),
      },
    });
    testDataTracker.add('activity', testActivity.id);
  });

  describe('create', () => {
    it('should create task activity', async () => {
      const activityData = {
        userId: testUser.id,
        name: 'New Task',
        type: 'task' as const,
        startDate: new Date('2024-10-17T08:00:00Z'),
        startTime: '8:00 AM',
        reminderEnabled: true,
        reminderOffset: '15 min before',
      };

      const activity = await activityService.create(activityData);

      expect(activity).toBeDefined();
      expect(activity.name).toBe('New Task');
      expect(activity.type).toBe('task');
      expect(activity.reminderEnabled).toBe(true);

      testDataTracker.add('activity', activity.id);
    });

    it('should create event activity with end date', async () => {
      const activityData = {
        userId: testUser.id,
        name: 'Team Meeting',
        type: 'event' as const,
        startDate: new Date('2024-10-17T08:00:00Z'),
        startTime: '8:00 AM',
        endDate: new Date('2024-10-17T09:00:00Z'),
        endTime: '9:00 AM',
        location: 'Vibre Saúde, Pinheiros, 142',
        reminderEnabled: true,
        reminderOffset: '5 min before',
      };

      const activity = await activityService.create(activityData);

      expect(activity).toBeDefined();
      expect(activity.type).toBe('event');
      expect(activity.endDate).toBeDefined();
      expect(activity.location).toBe('Vibre Saúde, Pinheiros, 142');

      testDataTracker.add('activity', activity.id);
    });
  });

  describe('findById', () => {
    it('should find activity by id', async () => {
      const activity = await activityService.findById(testActivity.id);

      expect(activity).toBeDefined();
      expect(activity?.id).toBe(testActivity.id);
      expect(activity?.name).toBe('Test Activity');
    });

    it('should return null for non-existent activity', async () => {
      const activity = await activityService.findById('non-existent-id');

      expect(activity).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should find all activities with filters', async () => {
      const result = await activityService.findAll(1, 10, {
        userId: testUser.id,
      });

      expect(result.activities).toBeDefined();
      expect(Array.isArray(result.activities)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter by type', async () => {
      await prisma.activity.create({
        data: {
          userId: testUser.id,
          name: 'Test Event',
          type: 'event',
          startDate: new Date(),
        },
      });

      const result = await activityService.findAll(1, 10, {
        userId: testUser.id,
        type: 'event',
      });

      expect(result.activities.length).toBeGreaterThan(0);
      result.activities.forEach((activity) => {
        expect(activity.type).toBe('event');
      });
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-10-01');
      const endDate = new Date('2024-10-31');

      const result = await activityService.findAll(1, 10, {
        userId: testUser.id,
        startDate,
        endDate,
      });

      expect(result.activities).toBeDefined();
      expect(Array.isArray(result.activities)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update activity', async () => {
      const updateData = {
        name: 'Updated Activity',
        location: 'New Location',
      };

      const updatedActivity = await activityService.update(testActivity.id, updateData);

      expect(updatedActivity.name).toBe('Updated Activity');
      expect(updatedActivity.location).toBe('New Location');
    });

    it('should update dates', async () => {
      const updateData = {
        startDate: new Date('2024-11-01T10:00:00Z'),
        endDate: new Date('2024-11-01T11:00:00Z'),
      };

      const updatedActivity = await activityService.update(testActivity.id, updateData);

      expect(updatedActivity.startDate).toBeDefined();
      expect(updatedActivity.endDate).toBeDefined();
    });

    it('should throw error when activity not found', async () => {
      await expect(
        activityService.update('non-existent-id', { name: 'Updated' })
      ).rejects.toThrow('Activity not found');
    });
  });

  describe('delete', () => {
    it('should soft delete activity', async () => {
      await activityService.delete(testActivity.id);

      const deletedActivity = await prisma.activity.findUnique({
        where: { id: testActivity.id },
      });

      expect(deletedActivity?.deletedAt).toBeDefined();
    });

    it('should throw error when activity not found', async () => {
      await expect(activityService.delete('non-existent-id')).rejects.toThrow('Activity not found');
    });
  });
});
