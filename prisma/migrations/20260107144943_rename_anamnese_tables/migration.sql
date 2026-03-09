-- Rename tables to include "anamnese" prefix

-- Rename question_concept to anamnese_question_concept
ALTER TABLE "question_concept" RENAME TO "anamnese_question_concept";

-- Rename question_text to anamnese_question_text
ALTER TABLE "question_text" RENAME TO "anamnese_question_text";

-- Rename answer_option to anamnese_answer_option
ALTER TABLE "answer_option" RENAME TO "anamnese_answer_option";

-- Rename answer_option_text to anamnese_answer_option_text
ALTER TABLE "answer_option_text" RENAME TO "anamnese_answer_option_text";

-- Rename user_answer to anamnese_user_answer (if not already renamed)
ALTER TABLE "user_answer" RENAME TO "anamnese_user_answer";

-- Rename indexes for question_concept
ALTER INDEX "question_concept_pkey" RENAME TO "anamnese_question_concept_pkey";
ALTER INDEX "question_concept_key_key" RENAME TO "anamnese_question_concept_key_key";
ALTER INDEX "question_concept_key_idx" RENAME TO "anamnese_question_concept_key_idx";
ALTER INDEX "question_concept_type_idx" RENAME TO "anamnese_question_concept_type_idx";

-- Rename indexes for question_text
ALTER INDEX "question_text_pkey" RENAME TO "anamnese_question_text_pkey";
ALTER INDEX "question_text_question_concept_id_locale_key" RENAME TO "anamnese_question_text_question_concept_id_locale_key";
ALTER INDEX "question_text_question_concept_id_idx" RENAME TO "anamnese_question_text_question_concept_id_idx";
ALTER INDEX "question_text_locale_idx" RENAME TO "anamnese_question_text_locale_idx";

-- Rename indexes for answer_option
ALTER INDEX "answer_option_pkey" RENAME TO "anamnese_answer_option_pkey";
ALTER INDEX "answer_option_question_concept_id_key_key" RENAME TO "anamnese_answer_option_question_concept_id_key_key";
ALTER INDEX "answer_option_question_concept_id_idx" RENAME TO "anamnese_answer_option_question_concept_id_idx";
ALTER INDEX "answer_option_key_idx" RENAME TO "anamnese_answer_option_key_idx";
ALTER INDEX "answer_option_order_idx" RENAME TO "anamnese_answer_option_order_idx";

-- Rename indexes for answer_option_text
ALTER INDEX "answer_option_text_pkey" RENAME TO "anamnese_answer_option_text_pkey";
ALTER INDEX "answer_option_text_answer_option_id_locale_key" RENAME TO "anamnese_answer_option_text_answer_option_id_locale_key";
ALTER INDEX "answer_option_text_answer_option_id_idx" RENAME TO "anamnese_answer_option_text_answer_option_id_idx";
ALTER INDEX "answer_option_text_locale_idx" RENAME TO "anamnese_answer_option_text_locale_idx";

-- Rename indexes for user_answer
ALTER INDEX "user_answer_pkey" RENAME TO "anamnese_user_answer_pkey";
ALTER INDEX "user_answer_user_id_question_concept_id_key" RENAME TO "anamnese_user_answer_user_id_question_concept_id_key";
ALTER INDEX "user_answer_user_id_idx" RENAME TO "anamnese_user_answer_user_id_idx";
ALTER INDEX "user_answer_question_concept_id_idx" RENAME TO "anamnese_user_answer_question_concept_id_idx";
ALTER INDEX "user_answer_answer_option_id_idx" RENAME TO "anamnese_user_answer_answer_option_id_idx";
ALTER INDEX "user_answer_created_at_idx" RENAME TO "anamnese_user_answer_created_at_idx";

-- Rename foreign key constraints
ALTER TABLE "anamnese_question_text" RENAME CONSTRAINT "question_text_question_concept_id_fkey" TO "anamnese_question_text_question_concept_id_fkey";
ALTER TABLE "anamnese_answer_option" RENAME CONSTRAINT "answer_option_question_concept_id_fkey" TO "anamnese_answer_option_question_concept_id_fkey";
ALTER TABLE "anamnese_answer_option_text" RENAME CONSTRAINT "answer_option_text_answer_option_id_fkey" TO "anamnese_answer_option_text_answer_option_id_fkey";
ALTER TABLE "anamnese_user_answer" RENAME CONSTRAINT "user_answer_user_id_fkey" TO "anamnese_user_answer_user_id_fkey";
ALTER TABLE "anamnese_user_answer" RENAME CONSTRAINT "user_answer_question_concept_id_fkey" TO "anamnese_user_answer_question_concept_id_fkey";
ALTER TABLE "anamnese_user_answer" RENAME CONSTRAINT "user_answer_answer_option_id_fkey" TO "anamnese_user_answer_answer_option_id_fkey";

