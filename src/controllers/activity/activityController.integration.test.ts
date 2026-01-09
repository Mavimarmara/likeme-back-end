/**
 * Testes de Integração - Criação e Listagem de Atividades
 * 
 * IMPORTANTE: Estes testes garantem que atividades criadas aparecem na listagem
 * e capturam erros antes que o usuário os encontre
 * 
 * Para executar: NODE_ENV=development npm test -- activityController.integration.test.ts
 */

import request from 'supertest';
import app from '@/server';
import prisma from '@/config/database';
import { safeTestCleanup, TestDataTracker, createTestToken, generateTestId } from '@/utils/test-helpers';

// Aumentar timeout para testes de integração
jest.setTimeout(30000); // 30 segundos

// Só executar em desenvolvimento ou test
const shouldRunTests = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

describe('Activity Integration Tests - Create and List', () => {
  // Pular todos os testes se não estiver em desenvolvimento
  beforeAll(() => {
    if (!shouldRunTests) {
      console.warn('⚠️  Testes de integração pulados. Execute com NODE_ENV=development ou test');
      return;
    }
  });

  const testDataTracker = new TestDataTracker();
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    if (!shouldRunTests) return;

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

  describe('POST /api/activities -> GET /api/activities (End-to-End)', () => {
    it('deve criar uma atividade e ela deve aparecer imediatamente na listagem', async () => {
      if (!shouldRunTests) {
        console.log('⏭️  Teste pulado (não está em desenvolvimento)');
        return;
      }

      const activityData = {
        name: `Test Activity Integration ${Date.now()}${generateTestId()}`,
        type: 'event',
        startDate: new Date().toISOString(),
        startTime: '10:00 AM',
        endDate: new Date(Date.now() + 3600000).toISOString(), // 1 hora depois
        endTime: '11:00 AM',
        location: 'Test Location',
        description: 'Test Description',
        reminderEnabled: true,
        reminderOffset: '5 min before',
      };

      // 1. Criar a atividade
      const createResponse = await request(app)
        .post('/api/activities')
        .send(activityData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data).toBeDefined();
      expect(createResponse.body.data.id).toBeDefined();
      expect(createResponse.body.data.name).toBe(activityData.name);

      const createdActivityId = createResponse.body.data.id;
      // Para testes de integração, rastrear pelo ID mesmo sem sufixo
      // pois o Prisma gera UUIDs normais. A limpeza será feita pelo nome.
      testDataTracker.add('activity', createdActivityId);

      // 2. Verificar que a atividade foi salva no banco
      const activityInDb = await prisma.activity.findUnique({
        where: { id: createdActivityId },
      });

      expect(activityInDb).toBeDefined();
      expect(activityInDb?.name).toBe(activityData.name);
      expect(activityInDb?.userId).toBe(testUser.id);
      expect(activityInDb?.deletedAt).toBeNull(); // Não deve estar deletada

      // 3. Buscar a atividade na listagem
      const listResponse = await request(app)
        .get('/api/activities')
        .query({ page: 1, limit: 100 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.data.activities).toBeDefined();
      expect(Array.isArray(listResponse.body.data.activities)).toBe(true);

      // 4. Verificar que a atividade criada está na lista
      const activityInList = listResponse.body.data.activities.find(
        (a: any) => a.id === createdActivityId
      );

      expect(activityInList).toBeDefined();
      expect(activityInList.name).toBe(activityData.name);
      expect(activityInList.type).toBe(activityData.type);
      expect(activityInList.userId).toBe(testUser.id);
    });

    it('deve criar uma atividade task e ela deve aparecer na listagem', async () => {
      if (!shouldRunTests) {
        console.log('⏭️  Teste pulado (não está em desenvolvimento)');
        return;
      }

      const activityData = {
        name: `Test Task Integration ${Date.now()}${generateTestId()}`,
        type: 'task',
        startDate: new Date().toISOString(),
        startTime: '2:00 PM',
        description: 'Task Description',
        reminderEnabled: false,
      };

      // 1. Criar a atividade
      const createResponse = await request(app)
        .post('/api/activities')
        .send(activityData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.id).toBeDefined();

      const createdActivityId = createResponse.body.data.id;
      // Para testes de integração, rastrear pelo ID mesmo sem sufixo
      // pois o Prisma gera UUIDs normais. A limpeza será feita pelo nome.
      testDataTracker.add('activity', createdActivityId);

      // 2. Buscar a atividade na listagem
      const listResponse = await request(app)
        .get('/api/activities')
        .query({ page: 1, limit: 100, type: 'task' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.success).toBe(true);

      // 3. Verificar que a atividade criada está na lista filtrada por tipo
      const activityInList = listResponse.body.data.activities.find(
        (a: any) => a.id === createdActivityId
      );

      expect(activityInList).toBeDefined();
      expect(activityInList.type).toBe('task');
    });

    it('deve retornar erro se startDate estiver em formato inválido', async () => {
      if (!shouldRunTests) {
        console.log('⏭️  Teste pulado (não está em desenvolvimento)');
        return;
      }

      const activityData = {
        name: 'Test Activity',
        type: 'event',
        startDate: 'invalid-date-format', // Formato inválido
      };

      const createResponse = await request(app)
        .post('/api/activities')
        .send(activityData)
        .set('Authorization', `Bearer ${authToken}`);

      // Deve retornar erro de validação (400)
      expect([400, 422]).toContain(createResponse.status);
      expect(createResponse.body.success).toBe(false);
    });

    it('deve retornar erro se campos obrigatórios estiverem faltando', async () => {
      if (!shouldRunTests) {
        console.log('⏭️  Teste pulado (não está em desenvolvimento)');
        return;
      }

      const activityData = {
        // name faltando (será preenchido com "evento sem nome")
        type: 'event',
        // startDate faltando
      };

      const createResponse = await request(app)
        .post('/api/activities')
        .send(activityData)
        .set('Authorization', `Bearer ${authToken}`);

      // Deve retornar erro de validação (400) porque startDate é obrigatório
      expect([400, 422]).toContain(createResponse.status);
      expect(createResponse.body.success).toBe(false);
    });

    it('deve preencher name com "evento sem nome" quando name estiver vazio', async () => {
      if (!shouldRunTests) {
        console.log('⏭️  Teste pulado (não está em desenvolvimento)');
        return;
      }

      const activityData = {
        name: '', // String vazia
        type: 'event',
        startDate: new Date().toISOString(),
      };

      const createResponse = await request(app)
        .post('/api/activities')
        .send(activityData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.name).toBe('evento sem nome');

      const createdActivityId = createResponse.body.data.id;
      testDataTracker.add('activity', createdActivityId);

      // Verificar no banco de dados
      const activityInDb = await prisma.activity.findUnique({
        where: { id: createdActivityId },
      });
      expect(activityInDb?.name).toBe('evento sem nome');
    });

    it('deve preencher name com "evento sem nome" quando name não for fornecido', async () => {
      if (!shouldRunTests) {
        console.log('⏭️  Teste pulado (não está em desenvolvimento)');
        return;
      }

      const activityData = {
        // name não fornecido
        type: 'task',
        startDate: new Date().toISOString(),
      };

      const createResponse = await request(app)
        .post('/api/activities')
        .send(activityData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.name).toBe('evento sem nome');

      const createdActivityId = createResponse.body.data.id;
      testDataTracker.add('activity', createdActivityId);
    });

    it('deve criar atividade com data no formato YYYY-MM-DD (formato do frontend)', async () => {
      if (!shouldRunTests) {
        console.log('⏭️  Teste pulado (não está em desenvolvimento)');
        return;
      }

      // Simular o formato que o frontend envia (YYYY-MM-DD)
      const today = new Date();
      const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const activityData = {
        name: `Test Date Format ${Date.now()}${generateTestId()}`,
        type: 'event',
        startDate: dateString, // Formato YYYY-MM-DD
        startTime: '9:00 AM',
      };

      const createResponse = await request(app)
        .post('/api/activities')
        .send(activityData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.id).toBeDefined();

      const createdActivityId = createResponse.body.data.id;
      // Para testes de integração, rastrear pelo ID mesmo sem sufixo
      // pois o Prisma gera UUIDs normais. A limpeza será feita pelo nome.
      testDataTracker.add('activity', createdActivityId);

      // Verificar que a atividade aparece na listagem
      const listResponse = await request(app)
        .get('/api/activities')
        .query({ page: 1, limit: 100 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(listResponse.status).toBe(200);
      const activityInList = listResponse.body.data.activities.find(
        (a: any) => a.id === createdActivityId
      );
      expect(activityInList).toBeDefined();
    });
  });

  describe('GET /api/activities - Filtros e Paginação', () => {
    it('deve retornar apenas atividades do usuário autenticado', async () => {
      if (!shouldRunTests) {
        console.log('⏭️  Teste pulado (não está em desenvolvimento)');
        return;
      }

      // Criar atividade para o usuário de teste
      const activityId = generateTestId();
      const activity = await prisma.activity.create({
        data: {
          id: activityId,
          userId: testUser.id,
          name: `User Activity ${Date.now()}${generateTestId()}`,
          type: 'event',
          startDate: new Date(),
        },
      });
      testDataTracker.add('activity', activity.id);

      // Criar outro usuário e atividade para ele
      const otherPersonId = generateTestId();
      const otherPerson = await prisma.person.create({
        data: {
          id: otherPersonId,
          firstName: 'Other',
          lastName: 'User',
        },
      });
      testDataTracker.add('person', otherPerson.id);

      const otherUserId = generateTestId();
      const otherUser = await prisma.user.create({
        data: {
          id: otherUserId,
          personId: otherPerson.id,
          username: `other${Date.now()}${generateTestId()}@example.com`,
          password: 'hashed',
          isActive: true,
        },
      });
      testDataTracker.add('user', otherUser.id);

      const otherActivityId = generateTestId();
      const otherActivity = await prisma.activity.create({
        data: {
          id: otherActivityId,
          userId: otherUser.id,
          name: `Other User Activity ${Date.now()}${generateTestId()}`,
          type: 'event',
          startDate: new Date(),
        },
      });
      testDataTracker.add('activity', otherActivity.id);

      // Buscar atividades do usuário de teste
      const listResponse = await request(app)
        .get('/api/activities')
        .query({ page: 1, limit: 100 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.success).toBe(true);

      // Verificar que a atividade do usuário de teste está na lista
      const userActivity = listResponse.body.data.activities.find(
        (a: any) => a.id === activity.id
      );
      expect(userActivity).toBeDefined();

      // Verificar que a atividade do outro usuário NÃO está na lista
      const otherUserActivity = listResponse.body.data.activities.find(
        (a: any) => a.id === otherActivity.id
      );
      expect(otherUserActivity).toBeUndefined();
    });
  });

  describe('Date Timezone Handling', () => {
    it('deve criar atividade para hoje e ela deve aparecer com a data de hoje (não de ontem)', async () => {
      if (!shouldRunTests) {
        console.log('⏭️  Teste pulado (não está em desenvolvimento)');
        return;
      }

      // Obter data de hoje no formato YYYY-MM-DD (timezone local)
      const today = new Date();
      const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const activityData = {
        name: `Today Activity Test ${Date.now()}${generateTestId()}`,
        type: 'event',
        startDate: todayString, // Data de hoje no formato YYYY-MM-DD
        startTime: '10:00 AM',
      };

      // 1. Criar a atividade
      const createResponse = await request(app)
        .post('/api/activities')
        .send(activityData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.id).toBeDefined();

      const createdActivityId = createResponse.body.data.id;
      testDataTracker.add('activity', createdActivityId);

      // 2. Verificar que a data salva no banco é a correta
      const activityInDb = await prisma.activity.findUnique({
        where: { id: createdActivityId },
      });

      expect(activityInDb).toBeDefined();
      expect(activityInDb?.startDate).toBeDefined();

      // 3. Verificar que a data é de hoje (comparando apenas dia, mês e ano)
      // A data vem do banco como UTC, então precisamos comparar usando UTC também
      const dbDate = new Date(activityInDb!.startDate);
      const todayDate = new Date();
      
      // Comparar usando UTC para evitar problemas de timezone
      expect(dbDate.getUTCFullYear()).toBe(todayDate.getUTCFullYear());
      expect(dbDate.getUTCMonth()).toBe(todayDate.getUTCMonth());
      expect(dbDate.getUTCDate()).toBe(todayDate.getUTCDate());

      // 4. Buscar a atividade na listagem
      const listResponse = await request(app)
        .get('/api/activities')
        .query({ page: 1, limit: 100 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.success).toBe(true);

      // 5. Verificar que a atividade criada está na lista
      const activityInList = listResponse.body.data.activities.find(
        (a: any) => a.id === createdActivityId
      );

      expect(activityInList).toBeDefined();
      
      // 6. Verificar que a data retornada é de hoje (não de ontem)
      // A data vem como string ISO (UTC), então comparamos usando UTC
      const returnedDate = new Date(activityInList.startDate);
      expect(returnedDate.getUTCFullYear()).toBe(todayDate.getUTCFullYear());
      expect(returnedDate.getUTCMonth()).toBe(todayDate.getUTCMonth());
      expect(returnedDate.getUTCDate()).toBe(todayDate.getUTCDate());
    });

    it('deve criar atividade para amanhã e ela não deve aparecer como sendo de hoje', async () => {
      if (!shouldRunTests) {
        console.log('⏭️  Teste pulado (não está em desenvolvimento)');
        return;
      }

      // Obter data de amanhã no formato YYYY-MM-DD
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

      const activityData = {
        name: `Tomorrow Activity Test ${Date.now()}${generateTestId()}`,
        type: 'event',
        startDate: tomorrowString,
        startTime: '10:00 AM',
      };

      // 1. Criar a atividade
      const createResponse = await request(app)
        .post('/api/activities')
        .send(activityData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);

      const createdActivityId = createResponse.body.data.id;
      testDataTracker.add('activity', createdActivityId);

      // 2. Verificar que a data salva no banco é de amanhã (não de hoje)
      const activityInDb = await prisma.activity.findUnique({
        where: { id: createdActivityId },
      });

      expect(activityInDb).toBeDefined();
      const dbDate = new Date(activityInDb!.startDate);
      const todayDate = new Date();
      
      // Deve ser amanhã, não hoje (usando UTC para evitar problemas de timezone)
      expect(dbDate.getUTCDate()).toBe(todayDate.getUTCDate() + 1);
    });
  });
});

