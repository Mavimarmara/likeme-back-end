import type { AnamnesisUserAnswer } from '@prisma/client';
import type { AnamnesisDomain, AnamnesisQuestion, CreateUserAnswerData, UserAnswer } from '@/interfaces/anamnesis';
import { getAnamnesisRepository } from '@/utils/repositoryContainer';
import type { AnamnesisRepository } from '@/repositories';
import type { QuestionWithOptions } from '@/repositories/anamnesis/AnamnesisRepository';

// Constantes para markers padronizados
const STANDARDIZED_MARKERS = [
  'purpose-vision',
  'self-esteem',
  'spirituality',
  'connection',
  'environment',
  'nutrition',
  'activity',
  'stress',
  'sleep',
  'smile',
] as const;

const MARKER_NAMES: Record<string, string> = {
  activity: 'Activity',
  connection: 'Connection',
  environment: 'Environment',
  nutrition: 'Nutrition',
  'purpose-vision': 'Purpose & vision',
  'self-esteem': 'Self-esteem',
  sleep: 'Sleep',
  smile: 'Smile',
  spirituality: 'Spirituality',
  stress: 'Stress',
} as const;

type StandardizedMarker = (typeof STANDARDIZED_MARKERS)[number];

function getAnamnesisDomainFromKey(key: string): AnamnesisDomain {
  const prefix = key.split('_')[0]?.toLowerCase();
  const allowed: Record<string, AnamnesisDomain> = {
    body: 'body',
    mind: 'mind',
    habits: 'habits',
    movement: 'movement',
    sleep: 'sleep',
    nutrition: 'nutrition',
    stress: 'stress',
    spirituality: 'spirituality',
  };
  return allowed[prefix] ?? 'unknown';
}

export class AnamnesisService {
  private anamnesisRepository: AnamnesisRepository;
  private maxScoresCache: { mental: number; physical: number } | null = null;

  constructor(anamnesisRepository?: AnamnesisRepository) {
    this.anamnesisRepository = anamnesisRepository || getAnamnesisRepository();
  }

  async getAnamnesisQuestions(locale: string, keyPrefix?: string): Promise<AnamnesisQuestion[]> {
    const questions = await this.anamnesisRepository.findQuestionsWithTextsAndOptions(locale, keyPrefix);

    return questions.map((question) => ({
      id: question.id,
      key: question.key,
      domain: getAnamnesisDomainFromKey(question.key),
      answerType: question.type as any,
      text: question.texts[0]?.value || null,
      answerOptions: question.answerOptions.map((option) => ({
        id: option.id,
        key: option.key,
        order: option.order,
        text: option.texts[0]?.value || null,
      })),
    }));
  }

  async getQuestionByKey(
    key: string,
    locale: string
  ): Promise<AnamnesisQuestion | null> {
    const question = await this.anamnesisRepository.findQuestionByKeyWithDetails(key, locale);

    if (!question) {
      return null;
    }

    return {
      id: question.id,
      key: question.key,
      domain: getAnamnesisDomainFromKey(question.key),
      answerType: question.type as any,
      text: question.texts[0]?.value || null,
      answerOptions: question.answerOptions.map((option: any) => ({
        id: option.id,
        key: option.key,
        order: option.order,
        text: option.texts[0]?.value || null,
      })),
    };
  }

  async createOrUpdateUserAnswer(
    data: CreateUserAnswerData
  ): Promise<AnamnesisUserAnswer> {
    const question = await this.anamnesisRepository.findQuestionById(data.questionConceptId);

    if (!question) {
      throw new Error('Question concept not found');
    }

    if (data.answerOptionId) {
      const option = await this.anamnesisRepository.findAnswerOptionByIdAndQuestion(
        data.answerOptionId,
        data.questionConceptId
      );

      if (!option) {
        throw new Error('Answer option not found or does not belong to the question');
      }
    }

    if (question.type === 'single_choice' || question.type === 'multiple_choice') {
      if (!data.answerOptionId) {
        throw new Error('Answer option is required for choice questions');
      }
      if (data.answerText) {
        throw new Error('Answer text should not be provided for choice questions');
      }
    } else if (question.type === 'text' || question.type === 'number') {
      if (!data.answerText) {
        throw new Error('Answer text is required for text/number questions');
      }
      if (data.answerOptionId) {
        throw new Error('Answer option should not be provided for text/number questions');
      }
    }

    const existingAnswer = await this.anamnesisRepository.findAnswerByUserAndQuestion(
      data.userId,
      data.questionConceptId
    );

    if (existingAnswer) {
      await this.anamnesisRepository.updateAnswer(existingAnswer.id, {
        answerOptionId: data.answerOptionId || undefined,
        answerText: data.answerText || undefined,
      });
      return (await this.anamnesisRepository.findAnswerById(existingAnswer.id))!;
    } else {
      const result = await this.anamnesisRepository.saveAnswer({
        userId: data.userId,
        questionConceptId: data.questionConceptId,
        answerOptionId: data.answerOptionId || undefined,
        answerText: data.answerText || undefined,
      });
      return (await this.anamnesisRepository.findAnswerById(result.id))!;
    }
  }

  async getUserAnswers(
    userId: string,
    locale?: string
  ): Promise<UserAnswer[]> {
    const answers = await this.anamnesisRepository.findAnswersWithDetailsById(userId, locale);

    return answers.map((answer: any) => ({
      id: answer.id,
      userId: answer.userId,
      questionConceptId: answer.questionConceptId,
      questionKey: answer.questionConcept.key,
      answerOptionId: answer.answerOptionId,
      answerOptionKey: answer.answerOption?.key || null,
      answerText: answer.answerText,
      createdAt: answer.createdAt,
    }));
  }

  async getUserAnswerByQuestion(
    userId: string,
    questionConceptId: string
  ): Promise<AnamnesisUserAnswer | null> {
    return await this.anamnesisRepository.findAnswerByUserAndQuestion(userId, questionConceptId);
  }

  async getCompleteAnamnesisByLocale(locale: string) {
    return this.anamnesisRepository.findAllQuestionsWithDetails(locale);
  }

  private getQuestionMaxValue(question: QuestionWithOptions): number {
    if (!question.answerOptions || question.answerOptions.length === 0) {
      return 0;
    }

    const values = question.answerOptions
      .map(opt => parseFloat(opt.value || '0'))
      .filter(val => !isNaN(val));

    return values.length > 0 ? Math.max(...values) : 0;
  }

  /** Domínios de hábitos que contam para o score mental (mente) - português e inglês */
  private static readonly HABITS_MENTAL_DOMAINS = new Set([
    // Português
    'espiritualidade', 'estresse', 'autoestima', 'proposito',
    // Inglês
    'spirituality', 'stress', 'self-esteem', 'purpose-vision',
  ]);

  /** Domínios de hábitos que contam para o score physical (corpo) - português e inglês */
  private static readonly HABITS_PHYSICAL_DOMAINS = new Set([
    // Português
    'movimento', 'sono', 'nutricao', 'saude_bucal', 'relacionamentos',
    // Inglês
    'activity', 'sleep', 'nutrition', 'smile', 'connection',
  ]);

  private getQuestionCategory(key: string): 'mental' | 'physical' | null {
    const lower = key.toLowerCase();
    // Aceita mind_, mental*, body_, physical*, habits_*
    if (lower.startsWith('mind_') || lower.startsWith('mental')) {
      return 'mental';
    }
    if (lower.startsWith('body_') || lower.startsWith('physical')) {
      return 'physical';
    }
    const parts = lower.split('_');
    const prefix = parts[0];
    if (prefix === 'habits' && parts.length >= 2) {
      const domain = parts[1];
      if (AnamnesisService.HABITS_MENTAL_DOMAINS.has(domain)) {
        return 'mental';
      }
      if (AnamnesisService.HABITS_PHYSICAL_DOMAINS.has(domain)) {
        return 'physical';
      }
      // fallback: domínios não mapeados contam como physical (ex.: movimento, etc.)
      return 'physical';
    }

    return null;
  }

  private calculatePercentage(score: number, maxScore: number): number {
    if (maxScore <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((score / maxScore) * 100)));
  }

  async getMaxScores(): Promise<{ mental: number; physical: number }> {
    if (this.maxScoresCache) {
      return this.maxScoresCache;
    }

    const questions = await this.anamnesisRepository.findQuestionsWithOptionsForScores();

    const scores = questions.reduce(
      (acc, question) => {
        const category = this.getQuestionCategory(question.key);
        if (!category) return acc;

        const maxValue = this.getQuestionMaxValue(question);
        acc[category] += maxValue;
        return acc;
      },
      { mental: 0, physical: 0 }
    );

    this.maxScoresCache = scores;
    return scores;
  }

  clearMaxScoresCache(): void {
    this.maxScoresCache = null;
  }

  /**
   * Retorna scores e porcentagens **individuais** para mente e corpo.
   * Porcentagem calculada sobre o máximo das **perguntas respondidas** pelo usuário
   * (não sobre o total de perguntas do banco).
   */
  async getUserScores(userId: string): Promise<{
    mental: number;
    physical: number;
    maxMental: number;
    maxPhysical: number;
    mentalPercentage: number;
    physicalPercentage: number;
  }> {
    this.validateUserId(userId);

    const [answers, questionsWithOptions] = await Promise.all([
      this.anamnesisRepository.findAnswersWithDetailsById(userId),
      this.anamnesisRepository.findQuestionsWithOptionsForScores(),
    ]);

    const questionMaxByKey = new Map<string, number>();
    questionsWithOptions.forEach((q) => {
      questionMaxByKey.set(q.id, this.getQuestionMaxValue(q));
    });

    const scores = answers.reduce(
      (acc, answer) => {
        if (!answer.answerOptionId || !answer.answerOption) {
          return acc;
        }

        const optionValue = parseFloat(answer.answerOption.value || '0');
        if (isNaN(optionValue)) {
          return acc;
        }

        const category = this.getQuestionCategory(answer.questionConcept.key);
        const questionMax = questionMaxByKey.get(answer.questionConceptId) ?? 0;

        if (category === 'mental') {
          acc.mental += optionValue;
          acc.maxMental += questionMax;
        } else if (category === 'physical') {
          acc.physical += optionValue;
          acc.maxPhysical += questionMax;
        }

        return acc;
      },
      { mental: 0, physical: 0, maxMental: 0, maxPhysical: 0 }
    );

    const mentalPercentage = this.calculatePercentage(scores.mental, scores.maxMental);
    const physicalPercentage = this.calculatePercentage(scores.physical, scores.maxPhysical);

    return {
      mental: scores.mental,
      physical: scores.physical,
      maxMental: scores.maxMental,
      maxPhysical: scores.maxPhysical,
      mentalPercentage,
      physicalPercentage,
    };
  }

  private validateUserId(userId: string): void {
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error('Invalid userId');
    }
  }

  private getMarkerFromKey(key: string): StandardizedMarker | null {
    // As perguntas de markers podem ter o formato:
    // - habits_${marker}_...
    // - mind_${marker}_...
    // - body_${marker}_...
    const lowerKey = key.toLowerCase();
    
    // Verifica se começa com habits_, mind_ ou body_
    let prefix: string | null = null;
    let afterPrefix: string;
    
    if (lowerKey.startsWith('habits_')) {
      prefix = 'habits_';
      afterPrefix = lowerKey.substring(7);
    } else if (lowerKey.startsWith('mind_')) {
      prefix = 'mind_';
      afterPrefix = lowerKey.substring(5);
    } else if (lowerKey.startsWith('body_')) {
      prefix = 'body_';
      afterPrefix = lowerKey.substring(5);
    } else {
      return null;
    }
    
    // Ordena markers por tamanho (maior primeiro) para match mais específico
    const sortedMarkers = [...STANDARDIZED_MARKERS].sort((a, b) => b.length - a.length);
    
    // Verifica se começa com algum dos markers padronizados
    for (const marker of sortedMarkers) {
      if (afterPrefix.startsWith(marker)) {
        // Verifica se é exatamente o marker ou se tem underscore após
        const nextChar = afterPrefix[marker.length];
        if (!nextChar || nextChar === '_') {
          return marker as StandardizedMarker;
        }
      }
    }
    
    // Fallback: tenta pegar a primeira parte após o prefixo e verificar se é um marker válido
    const parts = afterPrefix.split('_');
    if (parts.length > 0) {
      const firstPart = parts[0];
      if (STANDARDIZED_MARKERS.includes(firstPart as StandardizedMarker)) {
        return firstPart as StandardizedMarker;
      }
    }
    
    return null;
  }

  async getUserMarkers(userId: string): Promise<Array<{
    id: string;
    name: string;
    percentage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>> {
    this.validateUserId(userId);

    const [answers, questions] = await Promise.all([
      this.anamnesisRepository.findAnswersWithDetailsById(userId),
      this.anamnesisRepository.findQuestionsWithOptionsForMarkers(),
    ]);

    // Inicializar estruturas de dados para todos os markers conhecidos
    const markerQuestions: Record<StandardizedMarker, QuestionWithOptions[]> = {} as Record<StandardizedMarker, QuestionWithOptions[]>;
    const markerMaxScores: Record<StandardizedMarker, number> = {} as Record<StandardizedMarker, number>;
    const markerScores: Record<StandardizedMarker, number> = {} as Record<StandardizedMarker, number>;

    STANDARDIZED_MARKERS.forEach((marker) => {
      markerQuestions[marker] = [];
      markerMaxScores[marker] = 0;
      markerScores[marker] = 0;
    });

    // Agrupar perguntas por marker
    questions.forEach((question) => {
      const marker = this.getMarkerFromKey(question.key);
      if (marker) {
        markerQuestions[marker].push(question);
        const maxValue = this.getQuestionMaxValue(question);
        markerMaxScores[marker] += maxValue;
      }
    });

    // Calcular scores do usuário por marker
    // Considerar respostas de perguntas que começam com habits_, mind_ ou body_
    answers.forEach((answer) => {
      if (!answer.answerOptionId || !answer.answerOption) {
        return;
      }

      const questionKey = answer.questionConcept.key.toLowerCase();
      
      // Considerar apenas perguntas de markers (habits_, mind_, body_)
      if (!questionKey.startsWith('habits_') && 
          !questionKey.startsWith('mind_') && 
          !questionKey.startsWith('body_')) {
        return;
      }

      const optionValue = parseFloat(answer.answerOption.value || '0');
      if (isNaN(optionValue)) {
        return;
      }

      const marker = this.getMarkerFromKey(answer.questionConcept.key);
      if (marker) {
        markerScores[marker] += optionValue;
      }
    });

    // Calcular porcentagens e determinar trends
    const result = STANDARDIZED_MARKERS.map((markerId) => {
      const maxScore = markerMaxScores[markerId] || 0;
      const score = markerScores[markerId] || 0;
      const percentage = this.calculatePercentage(score, maxScore);

      // Determinar trend baseado na porcentagem (simplificado - pode ser melhorado com histórico)
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (percentage >= 70) {
        trend = 'increasing';
      } else if (percentage <= 30) {
        trend = 'decreasing';
      }

      return {
        id: markerId,
        name: MARKER_NAMES[markerId] || markerId,
        percentage,
        trend,
      };
    });

    return result;
  }
}

const anamnesisServiceInstance = new AnamnesisService();

export const getAnamnesisQuestions = (locale: string, keyPrefix?: string) =>
  anamnesisServiceInstance.getAnamnesisQuestions(locale, keyPrefix);

export const getQuestionByKey = (key: string, locale: string) =>
  anamnesisServiceInstance.getQuestionByKey(key, locale);

export const createOrUpdateUserAnswer = (data: CreateUserAnswerData) =>
  anamnesisServiceInstance.createOrUpdateUserAnswer(data);

export const getUserAnswers = (userId: string, locale?: string) =>
  anamnesisServiceInstance.getUserAnswers(userId, locale);

export const getUserAnswerByQuestion = (userId: string, questionConceptId: string) =>
  anamnesisServiceInstance.getUserAnswerByQuestion(userId, questionConceptId);

export const getCompleteAnamnesisByLocale = (locale: string) =>
  anamnesisServiceInstance.getCompleteAnamnesisByLocale(locale);

export const getUserScores = (userId: string) =>
  anamnesisServiceInstance.getUserScores(userId);

export const clearMaxScoresCache = () =>
  anamnesisServiceInstance.clearMaxScoresCache();

export const getUserMarkers = (userId: string) =>
  anamnesisServiceInstance.getUserMarkers(userId);
