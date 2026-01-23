import type { AnamnesisUserAnswer } from '@prisma/client';
import type { AnamnesisDomain, AnamnesisQuestion, CreateUserAnswerData, UserAnswer } from '@/interfaces/anamnesis';
import { getAnamnesisRepository } from '@/utils/repositoryContainer';
import type { AnamnesisRepository } from '@/repositories';
import type { QuestionWithOptions } from '@/repositories/anamnesis/AnamnesisRepository';

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

  private getQuestionCategory(key: string): 'mental' | 'physical' | null {
    const prefix = key.toLowerCase().split('_')[0];
    
    if (prefix === 'mind' || prefix === 'mental') {
      return 'mental';
    }
    if (prefix === 'body' || prefix === 'physical') {
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

  async getUserScores(userId: string): Promise<{ 
    mental: number; 
    physical: number;
    maxMental: number;
    maxPhysical: number;
    mentalPercentage: number;
    physicalPercentage: number;
  }> {
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error('Invalid userId');
    }

    const [answers, maxScores] = await Promise.all([
      this.anamnesisRepository.findAnswersWithDetailsById(userId),
      this.getMaxScores(),
    ]);
    
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
        
        if (category === 'mental') {
          acc.mental += optionValue;
        } else if (category === 'physical') {
          acc.physical += optionValue;
        }
        
        return acc;
      },
      { mental: 0, physical: 0 }
    );

    return {
      mental: scores.mental,
      physical: scores.physical,
      maxMental: maxScores.mental,
      maxPhysical: maxScores.physical,
      mentalPercentage: this.calculatePercentage(scores.mental, maxScores.mental),
      physicalPercentage: this.calculatePercentage(scores.physical, maxScores.physical),
    };
  }

  private getMarkerFromKey(key: string): string | null {
    // As perguntas de markers têm o formato: habits_${marker}... ou habits_${marker}_...
    const lowerKey = key.toLowerCase();
    
    if (!lowerKey.startsWith('habits_')) {
      return null;
    }

    // Remove o prefixo "habits_"
    const afterHabits = lowerKey.substring(7); // Remove "habits_"
    
    // Mapeamento de nomes em português e inglês para IDs dos markers
    const markerMap: Record<string, string> = {
      // Inglês
      activity: 'activity',
      connection: 'connection',
      environment: 'environment',
      nutrition: 'nutrition',
      purpose: 'purpose-vision',
      vision: 'purpose-vision',
      'purpose-vision': 'purpose-vision',
      'purposevision': 'purpose-vision',
      'self-esteem': 'self-esteem',
      'selfesteem': 'self-esteem',
      sleep: 'sleep',
      smile: 'smile',
      spirituality: 'spirituality',
      stress: 'stress',
      // Português
      movimento: 'activity', // movimento = activity
      relacionamentos: 'connection', // relacionamentos = connection
      ambiente: 'environment', // ambiente = environment
      nutricao: 'nutrition', // nutricao = nutrition
      proposito: 'purpose-vision', // proposito = purpose-vision
      autoestima: 'self-esteem', // autoestima = self-esteem
      sono: 'sleep', // sono = sleep
      'saude-bucal': 'smile', // saude-bucal = smile
      'saude_bucal': 'smile', // saude_bucal = smile
      sorriso: 'smile', // sorriso = smile
      espiritualidade: 'spirituality', // espiritualidade = spirituality
      estresse: 'stress', // estresse = stress
    };
    
    // Tenta encontrar o marker verificando se a string começa com algum dos nomes
    for (const [markerKey, markerId] of Object.entries(markerMap)) {
      if (afterHabits.startsWith(markerKey)) {
        return markerId;
      }
    }
    
    // Se não encontrou, tenta pegar a primeira parte após habits_
    const parts = afterHabits.split('_');
    if (parts.length > 0) {
      const firstPart = parts[0];
      if (markerMap[firstPart]) {
        return markerMap[firstPart];
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
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error('Invalid userId');
    }

    const answers = await this.anamnesisRepository.findAnswersWithDetailsById(userId);
    const questions = await this.anamnesisRepository.findQuestionsWithOptionsForMarkers();

    console.log('[getUserMarkers] Debug:', {
      userId,
      answersCount: answers.length,
      questionsCount: questions.length,
      sampleQuestionKeys: questions.slice(0, 5).map((q) => q.key),
      sampleAnswerKeys: answers.slice(0, 5).map((a) => a.questionConcept?.key),
    });

    // Agrupar perguntas por marker
    const markerQuestions: Record<string, QuestionWithOptions[]> = {};
    const markerMaxScores: Record<string, number> = {};
    const markerScores: Record<string, number> = {};

    // Inicializar todos os markers conhecidos
    const knownMarkers = [
      'activity',
      'connection',
      'environment',
      'nutrition',
      'purpose-vision',
      'self-esteem',
      'sleep',
      'smile',
      'spirituality',
      'stress',
    ];

    knownMarkers.forEach((marker) => {
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
      } else {
        console.log('[getUserMarkers] Question not mapped to marker:', question.key);
      }
    });

    console.log('[getUserMarkers] Marker questions grouped:', {
      markerQuestionsCounts: Object.keys(markerQuestions).map(
        (marker) => `${marker}: ${markerQuestions[marker].length} questions`
      ),
      markerMaxScores,
    });

    // Calcular scores do usuário por marker
    answers.forEach((answer) => {
      if (!answer.answerOptionId || !answer.answerOption) {
        return;
      }

      const optionValue = parseFloat(answer.answerOption.value || '0');
      if (isNaN(optionValue)) {
        return;
      }

      const marker = this.getMarkerFromKey(answer.questionConcept.key);
      if (marker) {
        markerScores[marker] += optionValue;
      } else {
        console.log('[getUserMarkers] Answer not mapped to marker:', answer.questionConcept.key);
      }
    });

    console.log('[getUserMarkers] Marker scores:', markerScores);

    // Calcular porcentagens e determinar trends
    const markerNames: Record<string, string> = {
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
    };

    const result = knownMarkers.map((markerId) => {
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
        name: markerNames[markerId] || markerId,
        percentage,
        trend,
      };
    });

    console.log('[getUserMarkers] Final result:', result);
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

export const getUserMarkers = (userId: string) =>
  anamnesisServiceInstance.getUserMarkers(userId);
