import prisma from '@/config/database';
import { Prisma } from '@prisma/client';
import type {
  AnamnesisRepository,
  CreateAnamnesisAnswerData,
  AnamnesisAnswerData,
  UpdateAnamnesisAnswerData,
  QuestionWithDetails,
  QuestionBasic,
  AnswerOptionBasic,
  AnswerWithDetails,
  QuestionWithOptions,
} from './AnamnesisRepository';

export class PrismaAnamnesisRepository implements AnamnesisRepository {
  async saveAnswer(data: CreateAnamnesisAnswerData): Promise<{ id: string }> {
    const answer = await prisma.anamnesisUserAnswer.create({
      data: {
        userId: data.userId,
        questionConceptId: data.questionConceptId,
        answerOptionId: data.answerOptionId,
        answerText: data.answerText,
      },
      select: { id: true },
    });

    return { id: answer.id };
  }

  async findAnswerById(id: string): Promise<AnamnesisAnswerData | null> {
    const answer = await prisma.anamnesisUserAnswer.findUnique({
      where: { id },
    });

    return answer ? this.mapToAnamnesisAnswerData(answer) : null;
  }

  async findAnswersByUserId(userId: string): Promise<AnamnesisAnswerData[]> {
    const answers = await prisma.anamnesisUserAnswer.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return answers.map((a) => this.mapToAnamnesisAnswerData(a));
  }

  async findAnswerByUserAndQuestion(
    userId: string,
    questionConceptId: string
  ): Promise<AnamnesisAnswerData | null> {
    const answer = await prisma.anamnesisUserAnswer.findUnique({
      where: {
        userId_questionConceptId: {
          userId,
          questionConceptId,
        },
      },
    });

    return answer ? this.mapToAnamnesisAnswerData(answer) : null;
  }

  async updateAnswer(id: string, data: UpdateAnamnesisAnswerData): Promise<void> {
    await prisma.anamnesisUserAnswer.update({
      where: { id },
      data: {
        answerOptionId: data.answerOptionId,
        answerText: data.answerText,
      },
    });
  }

  async deleteAnswer(id: string): Promise<void> {
    await prisma.anamnesisUserAnswer.delete({
      where: { id },
    });
  }

  async findQuestionsWithTextsAndOptions(
    locale: string,
    keyPrefix?: string
  ): Promise<QuestionWithDetails[]> {
    const whereClause: Prisma.AnamnesisQuestionConceptWhereInput = {
      deletedAt: null,
    };

    if (keyPrefix) {
      whereClause.key = {
        startsWith: keyPrefix,
      };
    }

    const questions = await prisma.anamnesisQuestionConcept.findMany({
      where: whereClause,
      include: {
        texts: {
          where: { locale },
          take: 1,
        },
        answerOptions: {
          include: {
            texts: {
              where: { locale },
              take: 1,
            },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return questions as QuestionWithDetails[];
  }

  async findQuestionByKeyWithDetails(
    key: string,
    locale: string
  ): Promise<QuestionWithDetails | null> {
    const question = await prisma.anamnesisQuestionConcept.findUnique({
      where: {
        key: key,
        deletedAt: null,
      },
      include: {
        texts: {
          where: { locale },
          take: 1,
        },
        answerOptions: {
          include: {
            texts: {
              where: { locale },
              take: 1,
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    return question as QuestionWithDetails | null;
  }

  async findQuestionById(id: string): Promise<QuestionBasic | null> {
    const question = await prisma.anamnesisQuestionConcept.findUnique({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        key: true,
        type: true,
      },
    });

    return question;
  }

  async findAnswerOptionByIdAndQuestion(
    optionId: string,
    questionId: string
  ): Promise<AnswerOptionBasic | null> {
    const option = await prisma.anamnesisAnswerOption.findFirst({
      where: {
        id: optionId,
        questionConceptId: questionId,
      },
      select: {
        id: true,
        key: true,
        questionConceptId: true,
      },
    });

    return option;
  }

  async findAnswersWithDetailsById(
    userId: string,
    locale?: string
  ): Promise<AnswerWithDetails[]> {
    const answers = await prisma.anamnesisUserAnswer.findMany({
      where: { userId },
      include: {
        questionConcept: {
          include: locale
            ? {
                texts: {
                  where: { locale },
                  take: 1,
                },
              }
            : undefined,
        },
        answerOption: {
          select: {
            id: true,
            key: true,
            value: true,
            ...(locale
          ? {
                texts: {
                  where: { locale },
                  take: 1,
                  },
                }
              : {}),
                },
              },
      },
      orderBy: { createdAt: 'desc' },
    });

    return answers as AnswerWithDetails[];
  }

  async findAllQuestionsWithDetails(locale: string): Promise<any> {
    return prisma.anamnesisQuestionConcept.findMany({
      where: { deletedAt: null },
      include: {
        texts: {
          where: { locale },
        },
        answerOptions: {
          include: {
            texts: {
              where: { locale },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findQuestionsWithOptionsForScores(): Promise<QuestionWithOptions[]> {
    const questions = await prisma.anamnesisQuestionConcept.findMany({
      where: {
        deletedAt: null,
        OR: [
          { key: { startsWith: 'mind_' } },
          { key: { startsWith: 'mental' } }, // mental_ e mental (sem underscore)
          { key: { startsWith: 'body_' } },
          { key: { startsWith: 'physical' } }, // physical_ e physical (sem underscore)
          { key: { startsWith: 'habits_' } },
        ],
      },
      select: {
        id: true,
        key: true,
        answerOptions: {
          select: { value: true },
        },
      },
    });

    return questions.map((q) => ({
      id: q.id,
      key: q.key,
      answerOptions: q.answerOptions.map((opt) => ({
        value: opt.value,
      })),
    }));
  }

  async findQuestionsWithOptionsForMarkers(): Promise<QuestionWithOptions[]> {
    const questions = await prisma.anamnesisQuestionConcept.findMany({
      where: {
        deletedAt: null,
        OR: [
          { key: { startsWith: 'habits_' } },
          { key: { startsWith: 'mind_' } },
          { key: { startsWith: 'body_' } },
        ],
      },
      select: {
        id: true,
        key: true,
        answerOptions: {
          select: { value: true },
        },
      },
    });

    return questions.map((q) => ({
      id: q.id,
      key: q.key,
      answerOptions: q.answerOptions.map((opt) => ({
        value: opt.value,
      })),
    }));
  }

  private mapToAnamnesisAnswerData(answer: any): AnamnesisAnswerData {
    return {
      id: answer.id,
      userId: answer.userId,
      questionConceptId: answer.questionConceptId,
      answerOptionId: answer.answerOptionId,
      answerText: answer.answerText,
      createdAt: answer.createdAt,
      updatedAt: answer.updatedAt,
    };
  }
}
