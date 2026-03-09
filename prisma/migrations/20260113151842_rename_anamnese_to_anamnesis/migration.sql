-- Renomear tabelas de anamnese para anamnesis
ALTER TABLE IF EXISTS "anamnese_question_concept" RENAME TO "anamnesis_question_concept";
ALTER TABLE IF EXISTS "anamnese_question_text" RENAME TO "anamnesis_question_text";
ALTER TABLE IF EXISTS "anamnese_answer_option" RENAME TO "anamnesis_answer_option";
ALTER TABLE IF EXISTS "anamnese_answer_option_text" RENAME TO "anamnesis_answer_option_text";
ALTER TABLE IF EXISTS "anamnese_user_answer" RENAME TO "anamnesis_user_answer";

