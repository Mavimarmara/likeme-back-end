import type { QuestionType } from '@prisma/client';

export type AnamnesisDomain =
  | 'body'
  | 'mind'
  | 'habits'
  | 'movement'
  | 'sleep'
  | 'nutrition'
  | 'stress'
  | 'spirituality'
  | 'unknown';

/**
 * Interface para uma pergunta da anamnesis com textos traduzidos e opções de resposta
 */
export interface AnamnesisQuestion {
  id: string;
  key: string;
  domain: AnamnesisDomain;
  answerType: QuestionType;
  text: string | null;
  answerOptions: Array<{
    id: string;
    key: string;
    order: number;
    text: string | null;
  }>;
}

/**
 * Interface para dados de criação/atualização de resposta do usuário
 */
export interface CreateUserAnswerData {
  userId: string;
  questionConceptId: string;
  answerOptionId?: string | null;
  answerText?: string | null;
}

/**
 * Interface para resposta do usuário com informações completas
 */
export interface UserAnswer {
  id: string;
  userId: string;
  questionConceptId: string;
  questionKey: string;
  answerOptionId: string | null;
  answerOptionKey: string | null;
  answerText: string | null;
  createdAt: Date;
}

