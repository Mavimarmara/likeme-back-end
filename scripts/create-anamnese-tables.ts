import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createAnamneseTables() {
  try {
    console.log('🔄 Criando tabelas de anamnese...\n');

    // 1. Criar enum QuestionType
    console.log('1. Criando enum QuestionType...');
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "QuestionType" AS ENUM ('single_choice', 'multiple_choice', 'text', 'number');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('   ✅ Enum QuestionType criado\n');

    // 2. Criar tabela anamnesis_question_concept
    console.log('2. Criando tabela anamnesis_question_concept...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "anamnesis_question_concept" (
        "id" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        "deleted_at" TIMESTAMP(3),
        "key" TEXT NOT NULL,
        "type" "QuestionType" NOT NULL,
        CONSTRAINT "anamnesis_question_concept_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('   ✅ Tabela anamnesis_question_concept criada\n');

    // 3. Criar tabela anamnesis_question_text
    console.log('3. Criando tabela anamnesis_question_text...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "anamnesis_question_text" (
        "id" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        "question_concept_id" TEXT NOT NULL,
        "locale" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        CONSTRAINT "anamnesis_question_text_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('   ✅ Tabela anamnesis_question_text criada\n');

    // 4. Criar tabela anamnesis_answer_option
    console.log('4. Criando tabela anamnesis_answer_option...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "anamnesis_answer_option" (
        "id" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        "question_concept_id" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "anamnesis_answer_option_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('   ✅ Tabela anamnesis_answer_option criada\n');

    // 5. Criar tabela anamnesis_answer_option_text
    console.log('5. Criando tabela anamnesis_answer_option_text...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "anamnesis_answer_option_text" (
        "id" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        "answer_option_id" TEXT NOT NULL,
        "locale" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        CONSTRAINT "anamnesis_answer_option_text_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('   ✅ Tabela anamnesis_answer_option_text criada\n');

    // 6. Criar tabela anamnesis_user_answer
    console.log('6. Criando tabela anamnesis_user_answer...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "anamnesis_user_answer" (
        "id" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        "user_id" TEXT NOT NULL,
        "question_concept_id" TEXT NOT NULL,
        "answer_option_id" TEXT,
        "answer_text" TEXT,
        CONSTRAINT "anamnesis_user_answer_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('   ✅ Tabela anamnesis_user_answer criada\n');

    // 7. Criar índices e constraints
    console.log('7. Criando índices e constraints...');
    
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "anamnesis_question_concept_key_key" ON "anamnesis_question_concept"("key");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "anamnesis_question_concept_key_idx" ON "anamnesis_question_concept"("key");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "anamnesis_question_concept_type_idx" ON "anamnesis_question_concept"("type");
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "anamnesis_question_text_question_concept_id_locale_key" 
      ON "anamnesis_question_text"("question_concept_id", "locale");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "anamnesis_question_text_question_concept_id_idx" 
      ON "anamnesis_question_text"("question_concept_id");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "anamnesis_question_text_locale_idx" ON "anamnesis_question_text"("locale");
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "anamnesis_answer_option_question_concept_id_key_key" 
      ON "anamnesis_answer_option"("question_concept_id", "key");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "anamnesis_answer_option_question_concept_id_idx" 
      ON "anamnesis_answer_option"("question_concept_id");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "anamnesis_answer_option_key_idx" ON "anamnesis_answer_option"("key");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "anamnesis_answer_option_order_idx" ON "anamnesis_answer_option"("order");
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "anamnesis_answer_option_text_answer_option_id_locale_key" 
      ON "anamnesis_answer_option_text"("answer_option_id", "locale");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "anamnesis_answer_option_text_answer_option_id_idx" 
      ON "anamnesis_answer_option_text"("answer_option_id");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "anamnesis_answer_option_text_locale_idx" 
      ON "anamnesis_answer_option_text"("locale");
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "anamnesis_user_answer_user_id_question_concept_id_key" 
      ON "anamnesis_user_answer"("user_id", "question_concept_id");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "anamnesis_user_answer_user_id_idx" ON "anamnesis_user_answer"("user_id");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "anamnesis_user_answer_question_concept_id_idx" 
      ON "anamnesis_user_answer"("question_concept_id");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "anamnesis_user_answer_answer_option_id_idx" 
      ON "anamnesis_user_answer"("answer_option_id");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "anamnesis_user_answer_created_at_idx" 
      ON "anamnesis_user_answer"("created_at");
    `);
    
    console.log('   ✅ Índices criados\n');

    // 8. Criar foreign keys
    console.log('8. Criando foreign keys...');
    
    const fkConstraints = [
      {
        table: 'anamnesis_question_text',
        name: 'anamnesis_question_text_question_concept_id_fkey',
        column: 'question_concept_id',
        refTable: 'anamnesis_question_concept',
        refColumn: 'id',
        onDelete: 'CASCADE'
      },
      {
        table: 'anamnesis_answer_option',
        name: 'anamnesis_answer_option_question_concept_id_fkey',
        column: 'question_concept_id',
        refTable: 'anamnesis_question_concept',
        refColumn: 'id',
        onDelete: 'CASCADE'
      },
      {
        table: 'anamnesis_answer_option_text',
        name: 'anamnesis_answer_option_text_answer_option_id_fkey',
        column: 'answer_option_id',
        refTable: 'anamnesis_answer_option',
        refColumn: 'id',
        onDelete: 'CASCADE'
      },
      {
        table: 'anamnesis_user_answer',
        name: 'anamnesis_user_answer_user_id_fkey',
        column: 'user_id',
        refTable: 'user',
        refColumn: 'id',
        onDelete: 'CASCADE'
      },
      {
        table: 'anamnesis_user_answer',
        name: 'anamnesis_user_answer_question_concept_id_fkey',
        column: 'question_concept_id',
        refTable: 'anamnesis_question_concept',
        refColumn: 'id',
        onDelete: 'CASCADE'
      },
      {
        table: 'anamnesis_user_answer',
        name: 'anamnesis_user_answer_answer_option_id_fkey',
        column: 'answer_option_id',
        refTable: 'anamnesis_answer_option',
        refColumn: 'id',
        onDelete: 'SET NULL'
      }
    ];

    for (const fk of fkConstraints) {
      try {
        await prisma.$executeRawUnsafe(`
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = '${fk.name}'
            ) THEN
              ALTER TABLE "${fk.table}" 
              ADD CONSTRAINT "${fk.name}" 
              FOREIGN KEY ("${fk.column}") REFERENCES "${fk.refTable}"("${fk.refColumn}") 
              ON DELETE ${fk.onDelete} ON UPDATE CASCADE;
            END IF;
          END $$;
        `);
        console.log(`   ✅ FK ${fk.name} criada/verificada`);
      } catch (error: any) {
        if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
          console.log(`   ⚠️  FK ${fk.name} já existe`);
        } else {
          console.log(`   ⚠️  Erro ao criar FK ${fk.name}: ${error.message?.substring(0, 80)}`);
        }
      }
    }
    
    console.log('   ✅ Foreign keys processadas\n');

    console.log('✅ Todas as tabelas de anamnese foram criadas com sucesso!');
  } catch (error: any) {
    console.error('\n❌ Erro ao criar tabelas:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAnamneseTables();

