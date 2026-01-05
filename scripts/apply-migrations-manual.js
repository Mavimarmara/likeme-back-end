const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function applyMigrations() {
  try {
    console.log('🔄 Aplicando migrations manualmente...\n');

    // Migration 1: Adicionar coluna pagarme_recipient_id
    console.log('1. Adicionando coluna pagarme_recipient_id na tabela user...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "pagarme_recipient_id" TEXT;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "user_pagarme_recipient_id_key" ON "user"("pagarme_recipient_id");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "user_pagarme_recipient_id_idx" ON "user"("pagarme_recipient_id");
    `);
    console.log('   ✅ Coluna pagarme_recipient_id adicionada\n');

    // Migration 2: Adicionar coluna seller_id
    console.log('2. Adicionando coluna seller_id na tabela product...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "seller_id" TEXT;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "product_seller_id_idx" ON "product"("seller_id");
    `);
    console.log('   ✅ Coluna seller_id adicionada\n');

    // Migration 3: Criar tabela pagarme_recipient se não existir
    console.log('3. Verificando tabela pagarme_recipient...');
    const tableExists = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pagarme_recipient'
      );
    `);

    if (!tableExists[0].exists) {
      console.log('   Criando tabela pagarme_recipient...');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "pagarme_recipient" (
          "id" TEXT NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL,
          "deleted_at" TIMESTAMP(3),
          "recipient_id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "email" TEXT NOT NULL,
          "document" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "status" TEXT NOT NULL,
          "code" TEXT,
          "payment_mode" TEXT,
          "transfer_enabled" BOOLEAN DEFAULT true,
          "transfer_interval" TEXT,
          "transfer_day" INTEGER,
          "is_default" BOOLEAN NOT NULL DEFAULT false,
          CONSTRAINT "pagarme_recipient_pkey" PRIMARY KEY ("id")
        );
      `);
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "pagarme_recipient_recipient_id_key" ON "pagarme_recipient"("recipient_id");
      `);
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "pagarme_recipient_code_key" ON "pagarme_recipient"("code");
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "pagarme_recipient_recipient_id_idx" ON "pagarme_recipient"("recipient_id");
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "pagarme_recipient_code_idx" ON "pagarme_recipient"("code");
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "pagarme_recipient_is_default_idx" ON "pagarme_recipient"("is_default");
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "pagarme_recipient_status_idx" ON "pagarme_recipient"("status");
      `);
      console.log('   ✅ Tabela pagarme_recipient criada\n');
    } else {
      console.log('   ✅ Tabela pagarme_recipient já existe\n');
    }

    console.log('✅ Todas as migrations foram aplicadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao aplicar migrations:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigrations();

