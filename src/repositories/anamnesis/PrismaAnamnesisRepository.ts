import prisma from '@/config/database';
import type {
  AnamnesisRepository,
  CreateAnamnesisAnswerData,
  AnamnesisAnswerData,
  UpdateAnamnesisAnswerData,
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
