import type { AnamnesisUserAnswer } from '@prisma/client';
import type { AnamnesisDomain, AnamnesisQuestion, CreateUserAnswerData, UserAnswer } from '@/interfaces/anamnesis';
import { getAnamnesisRepository } from '@/utils/repositoryContainer';
import type { AnamnesisRepository } from '@/repositories';

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
