import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function applyActivityMigration() {
  try {
    console.log('📝 Aplicando migration da tabela activity...');

    const migrationPath = path.join(__dirname, '../prisma/migrations/create_activity_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Lendo arquivo de migration...');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS "activity" (
          "id" TEXT NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL,
          "deleted_at" TIMESTAMP(3),
          "user_id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "start_date" TIMESTAMP(3) NOT NULL,
          "start_time" TEXT,
          "end_date" TIMESTAMP(3),
          "end_time" TEXT,
          "location" TEXT,
          "reminder_enabled" BOOLEAN NOT NULL DEFAULT false,
          "reminder_offset" TEXT,
          CONSTRAINT "activity_pkey" PRIMARY KEY ("id")
      );
    `;

    const statements = [
      {
        sql: createTableSQL,
        name: 'CREATE TABLE activity',
      },
      {
        sql: 'CREATE INDEX IF NOT EXISTS "activity_user_id_idx" ON "activity"("user_id");',
        name: 'CREATE INDEX user_id',
      },
      {
        sql: 'CREATE INDEX IF NOT EXISTS "activity_type_idx" ON "activity"("type");',
        name: 'CREATE INDEX type',
      },
      {
        sql: 'CREATE INDEX IF NOT EXISTS "activity_start_date_idx" ON "activity"("start_date");',
        name: 'CREATE INDEX start_date',
      },
      {
        sql: 'CREATE INDEX IF NOT EXISTS "activity_end_date_idx" ON "activity"("end_date");',
        name: 'CREATE INDEX end_date',
      },
      {
        sql: `
          DO $$ 
          BEGIN
              IF NOT EXISTS (
                  SELECT 1 FROM pg_constraint 
                  WHERE conname = 'activity_user_id_fkey'
              ) THEN
                  ALTER TABLE "activity" 
                  ADD CONSTRAINT "activity_user_id_fkey" 
                  FOREIGN KEY ("user_id") 
                  REFERENCES "user"("id") 
                  ON DELETE CASCADE 
                  ON UPDATE CASCADE;
              END IF;
          END $$;
        `,
        name: 'ADD FOREIGN KEY constraint',
      },
    ];

    for (const { sql, name } of statements) {
      try {
        console.log(`\n🔄 Executando: ${name}...`);
        await prisma.$executeRawUnsafe(sql.trim());
        console.log('✅ Sucesso');
      } catch (error: any) {
        if (
          error.message?.includes('already exists') ||
          error.code === '42P07' ||
          error.code === '23505' ||
          error.meta?.code === '42P07'
        ) {
          console.log('⚠️  Já existe, pulando...');
          continue;
        }
        console.error(`❌ Erro ao executar ${name}:`, error.message);
        throw error;
      }
    }

    console.log('\n✅ Migration aplicada com sucesso!');
  } catch (error: any) {
    console.error('\n❌ Erro ao aplicar migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyActivityMigration()
  .then(() => {
    console.log('\n🎉 Concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Falha:', error);
    process.exit(1);
  });
