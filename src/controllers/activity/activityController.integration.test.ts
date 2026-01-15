/**
 * Testes de Integração E2E - Activity (SIMPLIFICADO)
 * 
 * OBJETIVO: Garantir que o fluxo completo POST -> DB -> GET funciona
 * e capturar casos críticos que unit tests não pegam.
 * 
 * MANTIDOS: Apenas 3 testes críticos (antes: 10)
 * - E2E básico (criar + listar)
 * - Autorização (isolamento entre usuários)
 * - Timezone (bug comum em produção)
 */

import request from 'supertest';
import app from '@/server';
import prisma from '@/config/database';
import { safeTestCleanup, TestDataTracker, createTestToken, generateTestId } from '@/utils/test-helpers';

jest.setTimeout(30000);

const shouldRunTests = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

describe('Activity E2E Integration (Critical Paths)', () => {
  const testDataTracker = new TestDataTracker();
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    if (!shouldRunTests) {
      console.warn('⚠️  Testes de integração pulados. Execute com NODE_ENV=development ou test');
      return;
    }

    authToken = await createTestToken(prisma, testDataTracker);
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'test-secret') as { userId: string };
    testUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { person: true },
    });
  });

  afterAll(async () => {
    if (!shouldRunTests) return;
    await safeTestCleanup(testDataTracker, prisma);
    await prisma.$disconnect();
  });

  describe('Critical E2E Flows', () => {
    it('POST /api/activities → DB → GET /api/activities (end-to-end)', async () => {
      if (!shouldRunTests) return;

      const activityData = {
        name: `E2E Test Activity ${Date.now()}${generateTestId()}`,
        type: 'event',
        startDate: new Date().toISOString(),
        startTime: '10:00 AM',
        location: 'Test Location',
        description: 'Critical E2E test',
      };

      // 1. POST: Criar atividade
      const createRes = await request(app)
        .post('/api/activities')
        .send(activityData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.data.id).toBeDefined();

      const activityId = createRes.body.data.id;
      testDataTracker.add('activity', activityId);

      // 2. DB: Verificar persistência
      const activityInDb = await prisma.activity.findUnique({
        where: { id: activityId },
      });

      expect(activityInDb).toBeDefined();
      expect(activityInDb?.name).toBe(activityData.name);
      expect(activityInDb?.userId).toBe(testUser.id);

      // 3. GET: Verificar na listagem
      const listRes = await request(app)
        .get('/api/activities')
        .query({ page: 1, limit: 100 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(listRes.status).toBe(200);
      const activityInList = listRes.body.data.activities.find(
        (a: any) => a.id === activityId
      );

      expect(activityInList).toBeDefined();
      expect(activityInList.name).toBe(activityData.name);
    });

    it('deve isolar atividades entre usuários (autorização)', async () => {
      if (!shouldRunTests) return;

      // Criar atividade para user1
      const activity1 = await prisma.activity.create({
        data: {
          id: generateTestId(),
          userId: testUser.id,
          name: `User1 Activity ${Date.now()}${generateTestId()}`,
          type: 'event',
          startDate: new Date(),
        },
      });
      testDataTracker.add('activity', activity1.id);

      // Criar user2 e sua atividade
      const person2 = await prisma.person.create({
        data: {
          id: generateTestId(),
          firstName: 'Other',
          lastName: 'User',
        },
      });
      testDataTracker.add('person', person2.id);

      const user2 = await prisma.user.create({
        data: {
          id: generateTestId(),
          personId: person2.id,
          username: `other${Date.now()}${generateTestId()}@example.com`,
          password: 'hashed',
          isActive: true,
        },
      });
      testDataTracker.add('user', user2.id);

      const activity2 = await prisma.activity.create({
        data: {
          id: generateTestId(),
          userId: user2.id,
          name: `User2 Activity ${Date.now()}${generateTestId()}`,
          type: 'event',
          startDate: new Date(),
        },
      });
      testDataTracker.add('activity', activity2.id);

      // Buscar atividades do user1
      const listRes = await request(app)
        .get('/api/activities')
        .query({ page: 1, limit: 100 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(listRes.status).toBe(200);

      // User1 deve ver APENAS suas atividades
      const userActivities = listRes.body.data.activities.filter(
        (a: any) => [activity1.id, activity2.id].includes(a.id)
      );

      expect(userActivities).toHaveLength(1);
      expect(userActivities[0].id).toBe(activity1.id);
    });

    it('deve preservar data correta (timezone bug crítico)', async () => {
      if (!shouldRunTests) return;

      // Data de hoje no formato do frontend (YYYY-MM-DD)
      const today = new Date();
      const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const activityData = {
        name: `Timezone Test ${Date.now()}${generateTestId()}`,
        type: 'event',
        startDate: todayString,
        startTime: '10:00 AM',
      };

      // Criar atividade
      const createRes = await request(app)
        .post('/api/activities')
        .send(activityData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(createRes.status).toBe(201);
      const activityId = createRes.body.data.id;
      testDataTracker.add('activity', activityId);

      // Verificar no DB (UTC)
      const activityInDb = await prisma.activity.findUnique({
        where: { id: activityId },
      });

      const dbDate = new Date(activityInDb!.startDate);
      expect(dbDate.getUTCFullYear()).toBe(today.getUTCFullYear());
      expect(dbDate.getUTCMonth()).toBe(today.getUTCMonth());
      expect(dbDate.getUTCDate()).toBe(today.getUTCDate());

      // Verificar na API (não deve estar off-by-one)
      const listRes = await request(app)
        .get('/api/activities')
        .query({ page: 1, limit: 100 })
        .set('Authorization', `Bearer ${authToken}`);

      const activityInList = listRes.body.data.activities.find(
        (a: any) => a.id === activityId
      );

      const returnedDate = new Date(activityInList.startDate);
      expect(returnedDate.getUTCFullYear()).toBe(today.getUTCFullYear());
      expect(returnedDate.getUTCMonth()).toBe(today.getUTCMonth());
      expect(returnedDate.getUTCDate()).toBe(today.getUTCDate());
    });
  });
});
