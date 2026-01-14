import prisma from '@/config/database';
import type { AnamnesisUserAnswer } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { AnamnesisDomain, AnamnesisQuestion, CreateUserAnswerData, UserAnswer } from '@/interfaces/anamnesis';

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

export async function getAnamnesisQuestions(locale: string, keyPrefix?: string): Promise<AnamnesisQuestion[]> {
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
    domain: getAnamnesisDomainFromKey(question.key),
    answerType: question.type,
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
): Promise<AnamnesisQuestion | null> {
  const question = await prisma.anamnesisQuestionConcept.findUnique({
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
    domain: getAnamnesisDomainFromKey(question.key),
    answerType: question.type,
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
): Promise<AnamnesisUserAnswer> {
  // Validação: verificar se a pergunta existe
  const question = await prisma.anamnesisQuestionConcept.findUnique({
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
    const option = await prisma.anamnesisAnswerOption.findFirst({
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
  const answer = await prisma.anamnesisUserAnswer.upsert({
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
  const answers = await prisma.anamnesisUserAnswer.findMany({
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
): Promise<AnamnesisUserAnswer | null> {
  return prisma.anamnesisUserAnswer.findUnique({
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
export async function getCompleteAnamnesisByLocale(locale: string) {
  return prisma.anamnesisQuestionConcept.findMany({
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

