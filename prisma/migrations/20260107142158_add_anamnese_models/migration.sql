-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('single_choice', 'multiple_choice', 'text', 'number');

-- CreateTable
CREATE TABLE "question_concept" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "key" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,

    CONSTRAINT "question_concept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_text" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "question_concept_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "question_text_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_option" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "question_concept_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "answer_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_option_text" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "answer_option_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "answer_option_text_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_answer" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_concept_id" TEXT NOT NULL,
    "answer_option_id" TEXT,
    "answer_text" TEXT,

    CONSTRAINT "user_answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "question_concept_key_key" ON "question_concept"("key");

-- CreateIndex
CREATE INDEX "question_concept_key_idx" ON "question_concept"("key");

-- CreateIndex
CREATE INDEX "question_concept_type_idx" ON "question_concept"("type");

-- CreateIndex
CREATE UNIQUE INDEX "question_text_question_concept_id_locale_key" ON "question_text"("question_concept_id", "locale");

-- CreateIndex
CREATE INDEX "question_text_question_concept_id_idx" ON "question_text"("question_concept_id");

-- CreateIndex
CREATE INDEX "question_text_locale_idx" ON "question_text"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "answer_option_question_concept_id_key_key" ON "answer_option"("question_concept_id", "key");

-- CreateIndex
CREATE INDEX "answer_option_question_concept_id_idx" ON "answer_option"("question_concept_id");

-- CreateIndex
CREATE INDEX "answer_option_key_idx" ON "answer_option"("key");

-- CreateIndex
CREATE INDEX "answer_option_order_idx" ON "answer_option"("order");

-- CreateIndex
CREATE UNIQUE INDEX "answer_option_text_answer_option_id_locale_key" ON "answer_option_text"("answer_option_id", "locale");

-- CreateIndex
CREATE INDEX "answer_option_text_answer_option_id_idx" ON "answer_option_text"("answer_option_id");

-- CreateIndex
CREATE INDEX "answer_option_text_locale_idx" ON "answer_option_text"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "user_answer_user_id_question_concept_id_key" ON "user_answer"("user_id", "question_concept_id");

-- CreateIndex
CREATE INDEX "user_answer_user_id_idx" ON "user_answer"("user_id");

-- CreateIndex
CREATE INDEX "user_answer_question_concept_id_idx" ON "user_answer"("question_concept_id");

-- CreateIndex
CREATE INDEX "user_answer_answer_option_id_idx" ON "user_answer"("answer_option_id");

-- CreateIndex
CREATE INDEX "user_answer_created_at_idx" ON "user_answer"("created_at");

-- AddForeignKey
ALTER TABLE "question_text" ADD CONSTRAINT "question_text_question_concept_id_fkey" FOREIGN KEY ("question_concept_id") REFERENCES "question_concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_option" ADD CONSTRAINT "answer_option_question_concept_id_fkey" FOREIGN KEY ("question_concept_id") REFERENCES "question_concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_option_text" ADD CONSTRAINT "answer_option_text_answer_option_id_fkey" FOREIGN KEY ("answer_option_id") REFERENCES "answer_option"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_answer" ADD CONSTRAINT "user_answer_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_answer" ADD CONSTRAINT "user_answer_question_concept_id_fkey" FOREIGN KEY ("question_concept_id") REFERENCES "question_concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_answer" ADD CONSTRAINT "user_answer_answer_option_id_fkey" FOREIGN KEY ("answer_option_id") REFERENCES "answer_option"("id") ON DELETE SET NULL ON UPDATE CASCADE;
