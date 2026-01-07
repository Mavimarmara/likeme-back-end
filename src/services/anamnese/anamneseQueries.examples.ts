/**
 * EXEMPLOS DE QUERIES PRISMA PARA ANAMNESE
 * 
 * Este arquivo contém exemplos práticos de como usar as queries Prisma
 * para o sistema de anamnese com suporte a i18n.
 */

import prisma from '@/config/database';

/**
 * EXEMPLO 1: Query completa que retorna question_concept com question_text
 * e answer_options com answer_option_text, filtrado por locale
 * 
 * Esta é a query principal solicitada nos requisitos.
 */
export async function getCompleteAnamneseByLocaleExample(locale: string) {
  return prisma.anamneseQuestionConcept.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      // Textos da pergunta filtrados por locale
      texts: {
        where: {
          locale: locale,
        },
      },
      // Opções de resposta com seus textos traduzidos
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

/**
 * EXEMPLO 2: Buscar uma pergunta específica por key com tradução
 */
export async function getQuestionByKeyExample(key: string, locale: string) {
  return prisma.anamneseQuestionConcept.findUnique({
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
}

/**
 * EXEMPLO 3: Buscar todas as respostas de um usuário com textos traduzidos
 */
export async function getUserAnswersWithTranslationsExample(
  userId: string,
  locale: string
) {
  return prisma.anamneseUserAnswer.findMany({
    where: {
      userId: userId,
    },
    include: {
      questionConcept: {
        include: {
          texts: {
            where: {
              locale: locale,
            },
            take: 1,
          },
        },
      },
      answerOption: {
        include: {
          texts: {
            where: {
              locale: locale,
            },
            take: 1,
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * EXEMPLO 4: Criar uma resposta do usuário (single_choice)
 */
export async function createSingleChoiceAnswerExample(
  userId: string,
  questionConceptId: string,
  answerOptionId: string
) {
  return prisma.anamneseUserAnswer.upsert({
    where: {
      userId_questionConceptId: {
        userId: userId,
        questionConceptId: questionConceptId,
      },
    },
    update: {
      answerOptionId: answerOptionId,
      answerText: null,
      updatedAt: new Date(),
    },
    create: {
      userId: userId,
      questionConceptId: questionConceptId,
      answerOptionId: answerOptionId,
      answerText: null,
    },
  });
}

/**
 * EXEMPLO 5: Criar uma resposta do usuário (text)
 */
export async function createTextAnswerExample(
  userId: string,
  questionConceptId: string,
  answerText: string
) {
  return prisma.anamneseUserAnswer.upsert({
    where: {
      userId_questionConceptId: {
        userId: userId,
        questionConceptId: questionConceptId,
      },
    },
    update: {
      answerOptionId: null,
      answerText: answerText,
      updatedAt: new Date(),
    },
    create: {
      userId: userId,
      questionConceptId: questionConceptId,
      answerOptionId: null,
      answerText: answerText,
    },
  });
}

/**
 * EXEMPLO 6: Buscar perguntas de um tipo específico
 */
export async function getQuestionsByTypeExample(
  type: 'single_choice' | 'multiple_choice' | 'text' | 'number',
  locale: string
) {
  return prisma.anamneseQuestionConcept.findMany({
    where: {
      type: type,
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
}

/**
 * EXEMPLO 7: Verificar se um usuário respondeu todas as perguntas
 */
export async function checkUserAnamneseCompletionExample(userId: string) {
  const totalQuestions = await prisma.anamneseQuestionConcept.count({
    where: {
      deletedAt: null,
    },
  });

  const answeredQuestions = await prisma.anamneseUserAnswer.count({
    where: {
      userId: userId,
    },
  });

  return {
    total: totalQuestions,
    answered: answeredQuestions,
    completed: totalQuestions === answeredQuestions,
    percentage: totalQuestions > 0 
      ? Math.round((answeredQuestions / totalQuestions) * 100) 
      : 0,
  };
}

/**
 * EXEMPLO 8: Buscar histórico de respostas de um usuário (com paginação)
 */
export async function getUserAnswersHistoryExample(
  userId: string,
  locale: string,
  page: number = 1,
  limit: number = 10
) {
  const skip = (page - 1) * limit;

  const [answers, total] = await Promise.all([
    prisma.anamneseUserAnswer.findMany({
      where: {
        userId: userId,
      },
      include: {
        questionConcept: {
          include: {
            texts: {
              where: {
                locale: locale,
              },
              take: 1,
            },
          },
        },
        answerOption: {
          include: {
            texts: {
              where: {
                locale: locale,
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: skip,
      take: limit,
    }),
    prisma.anamneseUserAnswer.count({
      where: {
        userId: userId,
      },
    }),
  ]);

  return {
    data: answers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

