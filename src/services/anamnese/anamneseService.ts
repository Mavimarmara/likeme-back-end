import prisma from '@/config/database';
import type { AnamneseUserAnswer } from '@prisma/client';
import type { AnamneseQuestion, CreateUserAnswerData, UserAnswer } from '@/interfaces/anamnese';

/**
 * Busca todas as perguntas da anamnese com textos traduzidos e opções de resposta
 * @param locale - Locale para tradução (ex: "pt-BR", "en-US")
 * @returns Array de perguntas com textos e opções traduzidas
 */
export async function getAnamneseQuestions(locale: string): Promise<AnamneseQuestion[]> {
  const questions = await prisma.anamneseQuestionConcept.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      texts: {
        where: {
          locale: locale,
        },
        take: 1,
      },
      answerOptions: {
        include: {
          texts: {
            where: {
              locale: locale,
            },
            take: 1,
          },
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return questions.map((question) => ({
    id: question.id,
    key: question.key,
    type: question.type,
    text: question.texts[0]?.value || null,
    answerOptions: question.answerOptions.map((option) => ({
      id: option.id,
      key: option.key,
      order: option.order,
      text: option.texts[0]?.value || null,
    })),
  }));
}

/**
 * Busca uma pergunta específica por key com textos traduzidos
 * @param key - Key da pergunta
 * @param locale - Locale para tradução
 * @returns Pergunta com textos e opções traduzidas ou null
 */
export async function getQuestionByKey(
  key: string,
  locale: string
): Promise<AnamneseQuestion | null> {
  const question = await prisma.anamneseQuestionConcept.findUnique({
    where: {
      key: key,
      deletedAt: null,
    },
    include: {
      texts: {
        where: {
          locale: locale,
        },
        take: 1,
      },
      answerOptions: {
        include: {
          texts: {
            where: {
              locale: locale,
            },
            take: 1,
          },
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
  });

  if (!question) {
    return null;
  }

  return {
    id: question.id,
    key: question.key,
    type: question.type,
    text: question.texts[0]?.value || null,
    answerOptions: question.answerOptions.map((option: any) => ({
      id: option.id,
      key: option.key,
      order: option.order,
      text: option.texts[0]?.value || null,
    })),
  };
}

/**
 * Cria ou atualiza uma resposta do usuário
 * @param data - Dados da resposta
 * @returns Resposta criada/atualizada
 */
export async function createOrUpdateUserAnswer(
  data: CreateUserAnswerData
): Promise<AnamneseUserAnswer> {
  // Validação: verificar se a pergunta existe
  const question = await prisma.anamneseQuestionConcept.findUnique({
    where: {
      id: data.questionConceptId,
      deletedAt: null,
    },
  });

  if (!question) {
    throw new Error('Question concept not found');
  }

  // Validação: se answerOptionId foi fornecido, verificar se existe e pertence à pergunta
  if (data.answerOptionId) {
    const option = await prisma.anamneseAnswerOption.findFirst({
      where: {
        id: data.answerOptionId,
        questionConceptId: data.questionConceptId,
      },
    });

    if (!option) {
      throw new Error('Answer option not found or does not belong to the question');
    }
  }

  // Validação: verificar tipo de pergunta
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

  // Upsert: atualiza se já existe, cria se não existe
  const answer = await prisma.anamneseUserAnswer.upsert({
    where: {
      userId_questionConceptId: {
        userId: data.userId,
        questionConceptId: data.questionConceptId,
      },
    },
    update: {
      answerOptionId: data.answerOptionId || null,
      answerText: data.answerText || null,
      updatedAt: new Date(),
    },
    create: {
      userId: data.userId,
      questionConceptId: data.questionConceptId,
      answerOptionId: data.answerOptionId || null,
      answerText: data.answerText || null,
    },
  });

  return answer;
}

/**
 * Busca todas as respostas de um usuário
 * @param userId - ID do usuário
 * @param locale - Locale para tradução (opcional)
 * @returns Array de respostas do usuário
 */
export async function getUserAnswers(
  userId: string,
  locale?: string
): Promise<UserAnswer[]> {
  const answers = await prisma.anamneseUserAnswer.findMany({
    where: {
      userId: userId,
    },
    include: {
      questionConcept: {
        include: locale
          ? {
              texts: {
                where: {
                  locale: locale,
                },
                take: 1,
              },
            }
          : undefined,
      },
      answerOption: locale
        ? {
            include: {
              texts: {
                where: {
                  locale: locale,
                },
                take: 1,
              },
            },
          }
        : true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

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

/**
 * Busca uma resposta específica do usuário
 * @param userId - ID do usuário
 * @param questionConceptId - ID do conceito da pergunta
 * @returns Resposta ou null
 */
export async function getUserAnswerByQuestion(
  userId: string,
  questionConceptId: string
): Promise<AnamneseUserAnswer | null> {
  return prisma.anamneseUserAnswer.findUnique({
    where: {
      userId_questionConceptId: {
        userId: userId,
        questionConceptId: questionConceptId,
      },
    },
  });
}

/**
 * Query Prisma completa que retorna question_concept com question_text e answer_options com answer_option_text
 * Filtrado por locale
 */
export async function getCompleteAnamneseByLocale(locale: string) {
  return prisma.anamneseQuestionConcept.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      texts: {
        where: {
          locale: locale,
        },
      },
      answerOptions: {
        include: {
          texts: {
            where: {
              locale: locale,
            },
          },
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

