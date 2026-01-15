export interface AnamnesisRepository {
  saveAnswer(data: CreateAnamnesisAnswerData): Promise<{ id: string }>;
  findAnswerById(id: string): Promise<AnamnesisAnswerData | null>;
  findAnswersByUserId(userId: string): Promise<AnamnesisAnswerData[]>;
  findAnswerByUserAndQuestion(userId: string, questionConceptId: string): Promise<AnamnesisAnswerData | null>;
  updateAnswer(id: string, data: UpdateAnamnesisAnswerData): Promise<void>;
  deleteAnswer(id: string): Promise<void>;
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
