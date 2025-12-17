const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyMigrations() {
  try {
    console.log('🔄 Aplicando migrações para a tabela Ad...\n');

    // Leitura do arquivo SQL
    const sqlPath = path.join(__dirname, '../prisma/migrations/apply_ad_migrations.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');

    // Remover comentários de linha (-- comment)
    sql = sql.replace(/--.*$/gm, '');

    // Executar os blocos DO $$ primeiro (eles precisam ser executados como um todo)
    const doBlocks = sql.match(/DO \$\$[\s\S]*?\$\$;/g) || [];
    for (const block of doBlocks) {
      try {
        const blockType = block.includes('external_url') ? 'external_url' :
                         block.includes('category') ? 'category' :
                         block.includes('advertiser_id') ? 'advertiser_id (nullable)' :
                         block.includes('product_id') ? 'product_id (nullable)' : 'bloco';
        console.log(`Executando migração: ${blockType}...`);
        await prisma.$executeRawUnsafe(block);
        console.log(`✅ ${blockType} - migração aplicada com sucesso\n`);
      } catch (error) {
        // Ignorar erros de "already exists" ou "does not exist"
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist') ||
            error.message.includes('duplicate') ||
            error.message.includes('column') && error.message.includes('already')) {
          console.log(`⚠️  ${block.includes('external_url') ? 'external_url' : block.includes('category') ? 'category' : 'campo'} - já existe ou não é necessário\n`);
        } else {
          console.error(`❌ Erro ao executar migração:`, error.message);
          throw error;
        }
      }
    }

    // Executar comandos CREATE INDEX (fora dos blocos DO)
    const indexCommands = sql.match(/CREATE INDEX[^;]*;/g) || [];
    for (const command of indexCommands) {
      try {
        console.log(`Criando índice...`);
        await prisma.$executeRawUnsafe(command.trim());
        console.log('✅ Índice criado com sucesso\n');
      } catch (error) {
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate')) {
          console.log('⚠️  Índice já existe\n');
        } else {
          console.error('❌ Erro ao criar índice:', error.message);
        }
      }
    }

    console.log('✅ Todas as migrações foram aplicadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao aplicar migrações:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigrations();
