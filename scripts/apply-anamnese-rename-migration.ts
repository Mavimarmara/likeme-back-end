import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('🔄 Aplicando migration de renomeação das tabelas de anamnese...\n');

    // Ler o arquivo SQL da migration
    const migrationPath = path.join(
      __dirname,
      '../prisma/migrations/20260107144943_rename_anamnese_tables/migration.sql'
    );
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Dividir o SQL em comandos individuais
    const commands = sql
      .split(';')
      .map((cmd) => cmd.trim())
      .filter((cmd) => cmd.length > 0 && !cmd.startsWith('--'));

    // Executar cada comando
    for (const command of commands) {
      if (command.trim().length === 0) continue;

      try {
        // Adicionar ponto e vírgula de volta
        const fullCommand = command.endsWith(';') ? command : `${command};`;
        await prisma.$executeRawUnsafe(fullCommand);
        console.log(`✅ Executado: ${command.substring(0, 60)}...`);
      } catch (error: any) {
        // Ignorar erros de "does not exist" ou "already exists"
        if (
          error.message.includes('does not exist') ||
          error.message.includes('already exists') ||
          error.message.includes('duplicate') ||
          (error.message.includes('column') && error.message.includes('already'))
        ) {
          console.log(`⚠️  Ignorado (já existe ou não necessário): ${command.substring(0, 60)}...`);
        } else {
          console.error(`❌ Erro ao executar: ${command.substring(0, 60)}...`);
          console.error(`   Erro: ${error.message}`);
          throw error;
        }
      }
    }

    console.log('\n✅ Migration aplicada com sucesso!');
  } catch (error) {
    console.error('\n❌ Erro ao aplicar migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();

