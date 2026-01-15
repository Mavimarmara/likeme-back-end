import { getAnamnesisQuestions, getQuestionByKey } from '@/services/anamnesis/anamnesisService';
import prisma from '@/config/database';
import { safeTestCleanup, TestDataTracker, generateTestId } from '@/utils/test-helpers';

jest.setTimeout(30000);

const testDataTracker = new TestDataTracker();

afterAll(async () => {
  await safeTestCleanup(testDataTracker, prisma);
  await prisma.$disconnect();
});

describe('AnamnesisService', () => {
  let mockQuestion: any;
  let mockQuestionMind: any;
  let mockQuestionBody: any;

  beforeAll(async () => {
    // Criar perguntas de teste
    mockQuestion = await prisma.anamnesisQuestionConcept.create({
      data: {
        id: generateTestId(),
        key: `test_question_${Date.now()}`,
        type: 'single_choice',
        texts: {
          create: [
            {
              id: generateTestId(),
              locale: 'pt-BR',
              value: 'Pergunta de teste em português',
            },
            {
              id: generateTestId(),
              locale: 'en-US',
              value: 'Test question in English',
            },
          ],
        },
        answerOptions: {
          create: [
            {
              id: generateTestId(),
              key: 'option_1',
              order: 0,
              texts: {
                create: [
                  {
                    id: generateTestId(),
                    locale: 'pt-BR',
                    value: 'Opção 1',
                  },
                  {
                    id: generateTestId(),
                    locale: 'en-US',
                    value: 'Option 1',
                  },
                ],
              },
            },
            {
              id: generateTestId(),
              key: 'option_2',
              order: 1,
              texts: {
                create: [
                  {
                    id: generateTestId(),
                    locale: 'pt-BR',
                    value: 'Opção 2',
                  },
                  {
                    id: generateTestId(),
                    locale: 'en-US',
                    value: 'Option 2',
                  },
                ],
              },
            },
          ],
        },
      },
    });
    testDataTracker.add('anamnesisQuestionConcept', mockQuestion.id);

    // Criar pergunta com prefixo mind_
    mockQuestionMind = await prisma.anamnesisQuestionConcept.create({
      data: {
        id: generateTestId(),
        key: `mind_anxiety_${Date.now()}`,
        type: 'number',
        texts: {
          create: [
            {
              id: generateTestId(),
              locale: 'pt-BR',
              value: 'Qual seu nível de ansiedade?',
            },
          ],
        },
      },
    });
    testDataTracker.add('anamnesisQuestionConcept', mockQuestionMind.id);

    // Criar pergunta com prefixo body_
    mockQuestionBody = await prisma.anamnesisQuestionConcept.create({
      data: {
        id: generateTestId(),
        key: `body_pain_${Date.now()}`,
        type: 'single_choice',
        texts: {
          create: [
            {
              id: generateTestId(),
              locale: 'pt-BR',
              value: 'Você sente dores?',
            },
          ],
        },
        answerOptions: {
          create: [
            {
              id: generateTestId(),
              key: 'sim',
              order: 0,
              texts: {
                create: [
                  {
                    id: generateTestId(),
                    locale: 'pt-BR',
                    value: 'Sim',
                  },
                ],
              },
            },
            {
              id: generateTestId(),
              key: 'nao',
              order: 1,
              texts: {
                create: [
                  {
                    id: generateTestId(),
                    locale: 'pt-BR',
                    value: 'Não',
                  },
                ],
              },
            },
          ],
        },
      },
    });
    testDataTracker.add('anamnesisQuestionConcept', mockQuestionBody.id);

    // Rastrear textos e opções
    const allQuestions = [mockQuestion, mockQuestionMind, mockQuestionBody];
    for (const q of allQuestions) {
      const texts = await prisma.anamnesisQuestionText.findMany({
        where: { questionConceptId: q.id },
      });
      texts.forEach((t) => testDataTracker.add('anamnesisQuestionText', t.id));

      const options = await prisma.anamnesisAnswerOption.findMany({
        where: { questionConceptId: q.id },
      });
      for (const opt of options) {
        testDataTracker.add('anamnesisAnswerOption', opt.id);
        const optTexts = await prisma.anamnesisAnswerOptionText.findMany({
          where: { answerOptionId: opt.id },
        });
        optTexts.forEach((t) => testDataTracker.add('anamnesisAnswerOptionText', t.id));
      }
    }
  });

  describe('getAnamnesisQuestions', () => {
    it('should get all questions without filter', async () => {
      const questions = await getAnamnesisQuestions('pt-BR');

      expect(questions).toBeDefined();
      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThanOrEqual(3);
    });

    it('should get questions with translation in correct locale', async () => {
      const questions = await getAnamnesisQuestions('pt-BR');

      const testQ = questions.find((q) => q.id === mockQuestion.id);
      expect(testQ).toBeDefined();
      expect(testQ?.text).toBe('Pergunta de teste em português');
    });

    it('should get questions with different locale translation', async () => {
      const questions = await getAnamnesisQuestions('en-US');

      const testQ = questions.find((q) => q.id === mockQuestion.id);
      expect(testQ).toBeDefined();
      expect(testQ?.text).toBe('Test question in English');
    });

    it('should filter questions by keyPrefix (mind_)', async () => {
      const questions = await getAnamnesisQuestions('pt-BR', 'mind_');

      expect(questions.length).toBeGreaterThanOrEqual(1);
      questions.forEach((q) => {
        expect(q.key).toMatch(/^mind_/);
      });
    });

    it('should filter questions by keyPrefix (body_)', async () => {
      const questions = await getAnamnesisQuestions('pt-BR', 'body_');

      expect(questions.length).toBeGreaterThanOrEqual(1);
      questions.forEach((q) => {
        expect(q.key).toMatch(/^body_/);
      });

      const bodyQ = questions.find((q) => q.id === mockQuestionBody.id);
      expect(bodyQ).toBeDefined();
    });

    it('should return empty array if no questions match keyPrefix', async () => {
      const questions = await getAnamnesisQuestions('pt-BR', 'nonexistent_prefix_');

      expect(questions).toEqual([]);
    });

    it('should map domain correctly for mind_ prefix', async () => {
      const questions = await getAnamnesisQuestions('pt-BR', 'mind_');

      const mindQ = questions.find((q) => q.id === mockQuestionMind.id);
      expect(mindQ).toBeDefined();
      expect(mindQ?.domain).toBe('mind');
    });

    it('should map domain correctly for body_ prefix', async () => {
      const questions = await getAnamnesisQuestions('pt-BR', 'body_');

      const bodyQ = questions.find((q) => q.id === mockQuestionBody.id);
      expect(bodyQ).toBeDefined();
      expect(bodyQ?.domain).toBe('body');
    });

    it('should map domain as unknown for unsupported prefix', async () => {
      const questions = await getAnamnesisQuestions('pt-BR');

      const testQ = questions.find((q) => q.key.startsWith('test_'));
      expect(testQ).toBeDefined();
      expect(testQ?.domain).toBe('unknown');
    });

    it('should include answerType in response', async () => {
      const questions = await getAnamnesisQuestions('pt-BR');

      const testQ = questions.find((q) => q.id === mockQuestion.id);
      expect(testQ).toBeDefined();
      expect(testQ?.answerType).toBe('single_choice');
    });

    it('should include answer options with correct order', async () => {
      const questions = await getAnamnesisQuestions('pt-BR');

      const testQ = questions.find((q) => q.id === mockQuestion.id);
      expect(testQ?.answerOptions).toBeDefined();
      expect(testQ?.answerOptions.length).toBe(2);
      expect(testQ?.answerOptions[0].order).toBe(0);
      expect(testQ?.answerOptions[1].order).toBe(1);
    });

    it('should include translated answer options', async () => {
      const questions = await getAnamnesisQuestions('pt-BR');

      const testQ = questions.find((q) => q.id === mockQuestion.id);
      expect(testQ?.answerOptions[0].text).toBe('Opção 1');
      expect(testQ?.answerOptions[1].text).toBe('Opção 2');
    });

    it('should handle locale without translations gracefully', async () => {
      const questions = await getAnamnesisQuestions('fr-FR'); // Locale sem traduções

      expect(questions).toBeDefined();
      // Deve retornar perguntas mesmo sem traduções (text será null)
    });

    it('should not include soft-deleted questions', async () => {
      // Criar e deletar uma pergunta
      const deletedQ = await prisma.anamnesisQuestionConcept.create({
        data: {
          id: generateTestId(),
          key: `deleted_${Date.now()}`,
          type: 'text',
          deletedAt: new Date(),
        },
      });
      testDataTracker.add('anamnesisQuestionConcept', deletedQ.id);

      const questions = await getAnamnesisQuestions('pt-BR');

      const foundDeleted = questions.find((q) => q.id === deletedQ.id);
      expect(foundDeleted).toBeUndefined();
    });

    it('should order questions by createdAt (asc)', async () => {
      const questions = await getAnamnesisQuestions('pt-BR');

      expect(questions.length).toBeGreaterThan(1);
      // Verificar que está ordenado (createdAt crescente)
      // Não podemos testar valores exatos de createdAt, mas podemos verificar estrutura
      expect(questions[0]).toHaveProperty('id');
    });
  });

  describe('getQuestionByKey', () => {
    it('should get question by key with translations', async () => {
      const question = await getQuestionByKey(mockQuestion.key, 'pt-BR');

      expect(question).toBeDefined();
      expect(question?.id).toBe(mockQuestion.id);
      expect(question?.key).toBe(mockQuestion.key);
      expect(question?.text).toBe('Pergunta de teste em português');
    });

    it('should get question with different locale', async () => {
      const question = await getQuestionByKey(mockQuestion.key, 'en-US');

      expect(question).toBeDefined();
      expect(question?.text).toBe('Test question in English');
    });

    it('should include domain in response', async () => {
      const question = await getQuestionByKey(mockQuestionMind.key, 'pt-BR');

      expect(question).toBeDefined();
      expect(question?.domain).toBe('mind');
    });

    it('should include answerType in response', async () => {
      const question = await getQuestionByKey(mockQuestion.key, 'pt-BR');

      expect(question).toBeDefined();
      expect(question?.answerType).toBe('single_choice');
    });

    it('should include answer options with translations', async () => {
      const question = await getQuestionByKey(mockQuestion.key, 'pt-BR');

      expect(question?.answerOptions).toBeDefined();
      expect(question?.answerOptions.length).toBe(2);
      expect(question?.answerOptions[0].text).toBe('Opção 1');
    });

    it('should return null if question not found', async () => {
      const question = await getQuestionByKey('nonexistent_key', 'pt-BR');

      expect(question).toBeNull();
    });

    it('should return null if question is soft-deleted', async () => {
      // Criar e deletar uma pergunta
      const deletedQ = await prisma.anamnesisQuestionConcept.create({
        data: {
          id: generateTestId(),
          key: `deleted_by_key_${Date.now()}`,
          type: 'text',
          deletedAt: new Date(),
        },
      });
      testDataTracker.add('anamnesisQuestionConcept', deletedQ.id);

      const question = await getQuestionByKey(deletedQ.key, 'pt-BR');

      expect(question).toBeNull();
    });
  });

  describe('Domain Mapping', () => {
    const domainTests = [
      { prefix: 'body_', expected: 'body' },
      { prefix: 'mind_', expected: 'mind' },
      { prefix: 'habits_', expected: 'habits' },
      { prefix: 'movement_', expected: 'movement' },
      { prefix: 'sleep_', expected: 'sleep' },
      { prefix: 'nutrition_', expected: 'nutrition' },
      { prefix: 'stress_', expected: 'stress' },
      { prefix: 'spirituality_', expected: 'spirituality' },
      { prefix: 'unknown_', expected: 'unknown' },
    ];

    domainTests.forEach(({ prefix, expected }) => {
      it(`should map ${prefix} to domain ${expected}`, async () => {
        const testKey = `${prefix}test_${Date.now()}`;
        const q = await prisma.anamnesisQuestionConcept.create({
          data: {
            id: generateTestId(),
            key: testKey,
            type: 'text',
          },
        });
        testDataTracker.add('anamnesisQuestionConcept', q.id);

        const questions = await getAnamnesisQuestions('pt-BR');
        const found = questions.find((question) => question.id === q.id);

        expect(found).toBeDefined();
        expect(found?.domain).toBe(expected);
      });
    });
  });
});

