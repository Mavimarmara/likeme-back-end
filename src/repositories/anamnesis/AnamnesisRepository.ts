export interface AnamnesisRepository {
  saveAnswer(data: CreateAnamnesisAnswerData): Promise<{ id: string }>;
  findAnswerById(id: string): Promise<AnamnesisAnswerData | null>;
  findAnswersByUserId(userId: string): Promise<AnamnesisAnswerData[]>;
  findAnswerByUserAndQuestion(userId: string, questionConceptId: string): Promise<AnamnesisAnswerData | null>;
  updateAnswer(id: string, data: UpdateAnamnesisAnswerData): Promise<void>;
  deleteAnswer(id: string): Promise<void>;
  
  findQuestionsWithTextsAndOptions(locale: string, keyPrefix?: string): Promise<QuestionWithDetails[]>;
  findQuestionByKeyWithDetails(key: string, locale: string): Promise<QuestionWithDetails | null>;
  findQuestionById(id: string): Promise<QuestionBasic | null>;
  findAnswerOptionByIdAndQuestion(optionId: string, questionId: string): Promise<AnswerOptionBasic | null>;
  findAnswersWithDetailsById(userId: string, locale?: string): Promise<AnswerWithDetails[]>;
  findAllQuestionsWithDetails(locale: string): Promise<any>;
  findQuestionsWithOptionsForScores(): Promise<QuestionWithOptions[]>;
}

export interface CreateAnamnesisAnswerData {
  userId: string;
  questionConceptId: string;
  answerOptionId?: string;
  answerText?: string;
}

export interface AnamnesisAnswerData {
  id: string;
  userId: string;
  questionConceptId: string;
  answerOptionId: string | null;
  answerText: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateAnamnesisAnswerData {
  answerOptionId?: string;
  answerText?: string;
}

export interface QuestionBasic {
  id: string;
  key: string;
  type: string;
}

export interface AnswerOptionBasic {
  id: string;
  key: string;
  questionConceptId: string;
}

export interface QuestionText {
  value: string;
}

export interface AnswerOptionText {
  value: string;
}

export interface AnswerOptionWithTexts {
  id: string;
  key: string;
  order: number;
  texts: AnswerOptionText[];
}

export interface QuestionWithDetails {
  id: string;
  key: string;
  type: string;
  texts: QuestionText[];
  answerOptions: AnswerOptionWithTexts[];
}

export interface AnswerWithDetails {
  id: string;
  userId: string;
  questionConceptId: string;
  answerOptionId: string | null;
  answerText: string | null;
  createdAt: Date;
  questionConcept: {
    key: string;
    texts?: QuestionText[];
  };
  answerOption: {
    id: string;
    key: string;
    value: string;
    texts?: AnswerOptionText[];
  } | null;
}

export interface QuestionWithOptions {
  id: string;
  key: string;
  answerOptions: Array<{
    value: string;
  }>;
}
