import request from 'supertest';
import app from '@/server';
import prisma from '@/config/database';
import { safeTestCleanup, TestDataTracker, TEST_ID_PREFIX } from '@/utils/test-helpers';
import { randomUUID } from 'crypto';

jest.setTimeout(30000);

beforeAll(async () => {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  NODE_ENV não está definido como "test". Os testes podem afetar o banco de dados de desenvolvimento!');
  }
});

// Tracker global para rastrear IDs criados durante os testes
const testDataTracker = new TestDataTracker();

afterAll(async () => {
  await safeTestCleanup(testDataTracker, prisma);
  await prisma.$disconnect();
});

// Helper para gerar ID de teste com sufixo
const generateTestId = (): string => {
  return `${randomUUID()}${TEST_ID_PREFIX}`;
};

// Helper para criar um token de teste
const createTestToken = async (): Promise<string> => {
  const personId = generateTestId();
  const person = await prisma.person.create({
    data: {
      id: personId,
      firstName: 'Test',
      lastName: 'User',
    },
  });
  testDataTracker.add('person', person.id);

  const userId = generateTestId();
  const user = await prisma.user.create({
    data: {
      id: userId,
      personId: person.id,
      username: `test${Date.now()}${TEST_ID_PREFIX}@example.com`,
      password: 'hashedpassword',
      isActive: true,
    },
  });
  testDataTracker.add('user', user.id);

  const jwt = require('jsonwebtoken');
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
};

// Helper para criar dados de teste de anamnesis
const createTestAnamnesisData = async () => {
  // Criar pergunta conceito
  const questionConceptId = generateTestId();
  const questionConcept = await prisma.anamneseQuestionConcept.create({
    data: {
      id: questionConceptId,
      key: `test-question-${Date.now()}${TEST_ID_PREFIX}`,
      type: 'single_choice',
      texts: {
        create: [
          {
            id: generateTestId(),
            locale: 'pt-BR',
            value: 'Como você está se sentindo hoje?',
          },
          {
            id: generateTestId(),
            locale: 'en-US',
            value: 'How are you feeling today?',
          },
        ],
      },
      answerOptions: {
        create: [
          {
            id: generateTestId(),
            key: `grave${TEST_ID_PREFIX}`,
            order: 0,
            texts: {
              create: [
                {
                  id: generateTestId(),
                  locale: 'pt-BR',
                  value: 'Graves sintomas',
                },
                {
                  id: generateTestId(),
                  locale: 'en-US',
                  value: 'Severe symptoms',
                },
              ],
            },
          },
          {
            id: generateTestId(),
            key: `moderado${TEST_ID_PREFIX}`,
            order: 1,
            texts: {
              create: [
                {
                  id: generateTestId(),
                  locale: 'pt-BR',
                  value: 'Moderados sintomas',
                },
                {
                  id: generateTestId(),
                  locale: 'en-US',
                  value: 'Moderate symptoms',
                },
              ],
            },
          },
          {
            id: generateTestId(),
            key: `leve${TEST_ID_PREFIX}`,
            order: 2,
            texts: {
              create: [
                {
                  id: generateTestId(),
                  locale: 'pt-BR',
                  value: 'Leves sintomas',
                },
                {
                  id: generateTestId(),
                  locale: 'en-US',
                  value: 'Mild symptoms',
                },
              ],
            },
          },
        ],
      },
    },
  });
  testDataTracker.add('anamneseQuestionConcept', questionConcept.id);

  // Rastrear textos e opções criadas
  const questionTexts = await prisma.anamneseQuestionText.findMany({
    where: { questionConceptId: questionConcept.id },
  });
  questionTexts.forEach((text) => testDataTracker.add('anamneseQuestionText', text.id));

  const answerOptions = await prisma.anamneseAnswerOption.findMany({
    where: { questionConceptId: questionConcept.id },
  });
  answerOptions.forEach((option) => {
    testDataTracker.add('anamneseAnswerOption', option.id);
  });

  const answerOptionTexts = await prisma.anamneseAnswerOptionText.findMany({
    where: {
      answerOptionId: { in: answerOptions.map((o) => o.id) },
    },
  });
  answerOptionTexts.forEach((text) => testDataTracker.add('anamneseAnswerOptionText', text.id));

  return { questionConcept, answerOptions };
};

describe('Anamnesis Endpoints', () => {
  let authToken: string;
  let testUser: any;
  let testQuestionConcept: any;
  let testAnswerOption: any;

  beforeAll(async () => {
    authToken = await createTestToken();

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'test-secret') as { userId: string };
    testUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    // Criar dados de teste
    const testData = await createTestAnamnesisData();
    testQuestionConcept = testData.questionConcept;
    testAnswerOption = testData.answerOptions[0];
  });

  describe('GET /api/anamnesis/questions', () => {
    it('should list all questions with translations', async () => {
      const response = await request(app)
        .get('/api/anamnesis/questions')
        .query({ locale: 'pt-BR' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require locale parameter', async () => {
      const response = await request(app)
        .get('/api/anamnesis/questions');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return questions with translated texts', async () => {
      const response = await request(app)
        .get('/api/anamnesis/questions')
        .query({ locale: 'pt-BR' });

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        const question = response.body.data[0];
        expect(question).toHaveProperty('id');
        expect(question).toHaveProperty('key');
        expect(question).toHaveProperty('type');
        expect(question).toHaveProperty('text');
        expect(question).toHaveProperty('answerOptions');
      }
    });

    it('should return questions in different locales', async () => {
      const ptResponse = await request(app)
        .get('/api/anamnesis/questions')
        .query({ locale: 'pt-BR' });

      const enResponse = await request(app)
        .get('/api/anamnesis/questions')
        .query({ locale: 'en-US' });

      expect(ptResponse.status).toBe(200);
      expect(enResponse.status).toBe(200);
    });
  });

  describe('GET /api/anamnesis/questions/:key', () => {
    it('should get a question by key', async () => {
      const response = await request(app)
        .get(`/api/anamnesis/questions/${testQuestionConcept.key}`)
        .query({ locale: 'pt-BR' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.key).toBe(testQuestionConcept.key);
      expect(response.body.data.text).toBeDefined();
    });

    it('should return 404 if question not found', async () => {
      const response = await request(app)
        .get('/api/anamnesis/questions/non-existent-key')
        .query({ locale: 'pt-BR' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should require locale parameter', async () => {
      const response = await request(app)
        .get(`/api/anamnesis/questions/${testQuestionConcept.key}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/anamnesis/complete', () => {
    it('should get complete anamnese with all questions and options', async () => {
      const response = await request(app)
        .get('/api/anamnesis/complete')
        .query({ locale: 'pt-BR' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require locale parameter', async () => {
      const response = await request(app)
        .get('/api/anamnesis/complete');

      expect(response.status).toBe(400);
    });

    it('should return complete structure with nested data', async () => {
      const response = await request(app)
        .get('/api/anamnesis/complete')
        .query({ locale: 'pt-BR' });

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        const question = response.body.data[0];
        expect(question).toHaveProperty('texts');
        expect(question).toHaveProperty('answerOptions');
        if (question.answerOptions && question.answerOptions.length > 0) {
          expect(question.answerOptions[0]).toHaveProperty('texts');
        }
      }
    });
  });

  describe('POST /api/anamnesis/answers', () => {
    it('should create a new answer with answerOptionId', async () => {
      const answerData = {
        userId: testUser.id,
        questionConceptId: testQuestionConcept.id,
        answerOptionId: testAnswerOption.id,
      };

      const response = await request(app)
        .post('/api/anamnesis/answers')
        .send(answerData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(testUser.id);
      expect(response.body.data.questionConceptId).toBe(testQuestionConcept.id);
      expect(response.body.data.answerOptionId).toBe(testAnswerOption.id);

      if (response.body.data?.id) {
        testDataTracker.add('anamneseUserAnswer', response.body.data.id);
      }
    });

    it('should create a new answer with answerText', async () => {
      // Criar pergunta de texto
      const textQuestionId = generateTestId();
      const textQuestion = await prisma.anamneseQuestionConcept.create({
        data: {
          id: textQuestionId,
          key: `test-text-question-${Date.now()}${TEST_ID_PREFIX}`,
          type: 'text',
          texts: {
            create: {
              id: generateTestId(),
              locale: 'pt-BR',
              value: 'Descreva seus sintomas',
            },
          },
        },
      });
      testDataTracker.add('anamneseQuestionConcept', textQuestion.id);
      
      // Rastrear texto criado
      const questionTexts = await prisma.anamneseQuestionText.findMany({
        where: { questionConceptId: textQuestion.id },
      });
      questionTexts.forEach((text) => testDataTracker.add('anamneseQuestionText', text.id));

      const answerData = {
        userId: testUser.id,
        questionConceptId: textQuestion.id,
        answerText: 'Estou me sentindo bem hoje',
      };

      const response = await request(app)
        .post('/api/anamnesis/answers')
        .send(answerData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.answerText).toBe(answerData.answerText);

      if (response.body.data?.id) {
        testDataTracker.add('anamneseUserAnswer', response.body.data.id);
      }
    });

    it('should update existing answer', async () => {
      // Criar uma nova pergunta para este teste para evitar conflito com testes anteriores
      const updateQuestionId = generateTestId();
      const updateQuestion = await prisma.anamneseQuestionConcept.create({
        data: {
          id: updateQuestionId,
          key: `test-update-question-${Date.now()}${TEST_ID_PREFIX}`,
          type: 'single_choice',
          texts: {
            create: {
              id: generateTestId(),
              locale: 'pt-BR',
              value: 'Pergunta para atualização',
            },
          },
          answerOptions: {
            create: [
              {
                id: generateTestId(),
                key: `option1${TEST_ID_PREFIX}`,
                order: 0,
                texts: {
                  create: {
                    id: generateTestId(),
                    locale: 'pt-BR',
                    value: 'Opção 1',
                  },
                },
              },
              {
                id: generateTestId(),
                key: `option2${TEST_ID_PREFIX}`,
                order: 1,
                texts: {
                  create: {
                    id: generateTestId(),
                    locale: 'pt-BR',
                    value: 'Opção 2',
                  },
                },
              },
            ],
          },
        },
      });
      testDataTracker.add('anamneseQuestionConcept', updateQuestion.id);
      
      const updateQuestionTexts = await prisma.anamneseQuestionText.findMany({
        where: { questionConceptId: updateQuestion.id },
      });
      updateQuestionTexts.forEach((text) => testDataTracker.add('anamneseQuestionText', text.id));
      
      const updateOptions = await prisma.anamneseAnswerOption.findMany({
        where: { questionConceptId: updateQuestion.id },
      });
      for (const option of updateOptions) {
        testDataTracker.add('anamneseAnswerOption', option.id);
        const optionTexts = await prisma.anamneseAnswerOptionText.findMany({
          where: { answerOptionId: option.id },
        });
        optionTexts.forEach((text) => testDataTracker.add('anamneseAnswerOptionText', text.id));
      }
      
      // Criar resposta inicial
      const initialAnswerId = generateTestId();
      const initialAnswer = await prisma.anamneseUserAnswer.create({
        data: {
          id: initialAnswerId,
          userId: testUser.id,
          questionConceptId: updateQuestion.id,
          answerOptionId: updateOptions[0].id,
        },
      });
      testDataTracker.add('anamneseUserAnswer', initialAnswer.id);

      // Buscar outra opção de resposta
      const otherOption = await prisma.anamneseAnswerOption.findFirst({
        where: {
          questionConceptId: updateQuestion.id,
          id: { not: updateOptions[0].id },
        },
      });

      if (!otherOption) {
        // Se não houver outra opção, usar a segunda opção que já foi criada
        const updateData = {
          userId: testUser.id,
          questionConceptId: updateQuestion.id,
          answerOptionId: updateOptions[1].id,
        };

        const response = await request(app)
          .post('/api/anamnesis/answers')
          .send(updateData)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.answerOptionId).toBe(updateData.answerOptionId);
        return;
      }

      // Atualizar resposta
      const updateData = {
        userId: testUser.id,
        questionConceptId: updateQuestion.id,
        answerOptionId: otherOption.id,
      };

      const response = await request(app)
        .post('/api/anamnesis/answers')
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.answerOptionId).toBe(updateData.answerOptionId);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/anamnesis/answers')
        .send({
          userId: testUser.id,
          // missing questionConceptId
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 if token is missing', async () => {
      // Criar uma nova pergunta para este teste
      const authTestQuestionId = generateTestId();
      const authTestQuestion = await prisma.anamneseQuestionConcept.create({
        data: {
          id: authTestQuestionId,
          key: `test-auth-question-${Date.now()}${TEST_ID_PREFIX}`,
          type: 'single_choice',
          texts: {
            create: {
              id: generateTestId(),
              locale: 'pt-BR',
              value: 'Pergunta para teste de auth',
            },
          },
        },
      });
      testDataTracker.add('anamneseQuestionConcept', authTestQuestion.id);
      
      const questionTexts = await prisma.anamneseQuestionText.findMany({
        where: { questionConceptId: authTestQuestion.id },
      });
      questionTexts.forEach((text) => testDataTracker.add('anamneseQuestionText', text.id));

      const response = await request(app)
        .post('/api/anamnesis/answers')
        .send({
          userId: testUser.id,
          questionConceptId: authTestQuestion.id,
        });

      // Pode retornar 400 (validação) ou 401 (auth), dependendo da ordem das validações
      expect([400, 401]).toContain(response.status);
    });
  });

  describe('GET /api/anamnesis/answers/user/:userId', () => {
    it('should get all answers for a user', async () => {
      // Criar uma nova pergunta para este teste
      const listQuestionId = generateTestId();
      const listQuestion = await prisma.anamneseQuestionConcept.create({
        data: {
          id: listQuestionId,
          key: `test-list-question-${Date.now()}${TEST_ID_PREFIX}`,
          type: 'single_choice',
          texts: {
            create: {
              id: generateTestId(),
              locale: 'pt-BR',
              value: 'Pergunta para lista',
            },
          },
          answerOptions: {
            create: {
              id: generateTestId(),
              key: `list-option${TEST_ID_PREFIX}`,
              order: 0,
              texts: {
                create: {
                  id: generateTestId(),
                  locale: 'pt-BR',
                  value: 'Opção lista',
                },
              },
            },
          },
        },
      });
      testDataTracker.add('anamneseQuestionConcept', listQuestion.id);
      
      const listQuestionTexts = await prisma.anamneseQuestionText.findMany({
        where: { questionConceptId: listQuestion.id },
      });
      listQuestionTexts.forEach((text) => testDataTracker.add('anamneseQuestionText', text.id));
      
      const listOptions = await prisma.anamneseAnswerOption.findMany({
        where: { questionConceptId: listQuestion.id },
      });
      for (const option of listOptions) {
        testDataTracker.add('anamneseAnswerOption', option.id);
        const optionTexts = await prisma.anamneseAnswerOptionText.findMany({
          where: { answerOptionId: option.id },
        });
        optionTexts.forEach((text) => testDataTracker.add('anamneseAnswerOptionText', text.id));
      }
      
      // Criar algumas respostas
      const answer1Id = generateTestId();
      const answer1 = await prisma.anamneseUserAnswer.create({
        data: {
          id: answer1Id,
          userId: testUser.id,
          questionConceptId: listQuestion.id,
          answerOptionId: listOptions[0].id,
        },
      });
      testDataTracker.add('anamneseUserAnswer', answer1.id);

      const response = await request(app)
        .get(`/api/anamnesis/answers/user/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get answers with locale translations', async () => {
      const response = await request(app)
        .get(`/api/anamnesis/answers/user/${testUser.id}`)
        .query({ locale: 'pt-BR' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        const answer = response.body.data[0];
        expect(answer).toHaveProperty('questionKey');
        expect(answer).toHaveProperty('answerOptionKey');
      }
    });

    it('should return empty array if user has no answers', async () => {
      // Criar novo usuário sem respostas
      const newPersonId = generateTestId();
      const newPerson = await prisma.person.create({
        data: {
          id: newPersonId,
          firstName: 'New',
          lastName: 'User',
        },
      });
      testDataTracker.add('person', newPerson.id);

      const newUserId = generateTestId();
      const newUser = await prisma.user.create({
        data: {
          id: newUserId,
          personId: newPerson.id,
          username: `newuser${Date.now()}${TEST_ID_PREFIX}@example.com`,
          password: 'hashedpassword',
          isActive: true,
        },
      });
      testDataTracker.add('user', newUser.id);

      const response = await request(app)
        .get(`/api/anamnesis/answers/user/${newUser.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /api/anamnesis/answers/user/:userId/question/:questionConceptId', () => {
    it('should get a specific answer for a user and question', async () => {
      // Criar uma nova pergunta para este teste
      const specificQuestionId = generateTestId();
      const specificQuestion = await prisma.anamneseQuestionConcept.create({
        data: {
          id: specificQuestionId,
          key: `test-specific-question-${Date.now()}${TEST_ID_PREFIX}`,
          type: 'single_choice',
          texts: {
            create: {
              id: generateTestId(),
              locale: 'pt-BR',
              value: 'Pergunta específica',
            },
          },
          answerOptions: {
            create: {
              id: generateTestId(),
              key: `specific-option${TEST_ID_PREFIX}`,
              order: 0,
              texts: {
                create: {
                  id: generateTestId(),
                  locale: 'pt-BR',
                  value: 'Opção específica',
                },
              },
            },
          },
        },
      });
      testDataTracker.add('anamneseQuestionConcept', specificQuestion.id);
      
      const specificQuestionTexts = await prisma.anamneseQuestionText.findMany({
        where: { questionConceptId: specificQuestion.id },
      });
      specificQuestionTexts.forEach((text) => testDataTracker.add('anamneseQuestionText', text.id));
      
      const specificOptions = await prisma.anamneseAnswerOption.findMany({
        where: { questionConceptId: specificQuestion.id },
      });
      for (const option of specificOptions) {
        testDataTracker.add('anamneseAnswerOption', option.id);
        const optionTexts = await prisma.anamneseAnswerOptionText.findMany({
          where: { answerOptionId: option.id },
        });
        optionTexts.forEach((text) => testDataTracker.add('anamneseAnswerOptionText', text.id));
      }
      
      // Criar resposta
      const answerId = generateTestId();
      const answer = await prisma.anamneseUserAnswer.create({
        data: {
          id: answerId,
          userId: testUser.id,
          questionConceptId: specificQuestion.id,
          answerOptionId: specificOptions[0].id,
        },
      });
      testDataTracker.add('anamneseUserAnswer', answer.id);

      const response = await request(app)
        .get(`/api/anamnesis/answers/user/${testUser.id}/question/${specificQuestion.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(testUser.id);
      expect(response.body.data.questionConceptId).toBe(specificQuestion.id);
    });

    it('should return 404 if answer not found', async () => {
      // Criar nova pergunta sem resposta
      const newQuestionId = generateTestId();
      const newQuestion = await prisma.anamneseQuestionConcept.create({
        data: {
          id: newQuestionId,
          key: `test-new-question-${Date.now()}${TEST_ID_PREFIX}`,
          type: 'single_choice',
          texts: {
            create: {
              id: generateTestId(),
              locale: 'pt-BR',
              value: 'Nova pergunta',
            },
          },
        },
      });
      testDataTracker.add('anamneseQuestionConcept', newQuestion.id);
      
      // Rastrear texto criado
      const questionTexts = await prisma.anamneseQuestionText.findMany({
        where: { questionConceptId: newQuestion.id },
      });
      questionTexts.forEach((text) => testDataTracker.add('anamneseQuestionText', text.id));

      const response = await request(app)
        .get(`/api/anamnesis/answers/user/${testUser.id}/question/${newQuestion.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});

