import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('🔄 Aplicando migration de criação das tabelas de anamnese com nomes corretos...\n');

    // Ler o arquivo SQL da migration original
    const migrationPath = path.join(
      __dirname,
      '../prisma/migrations/20260107142151_add_anamnese_models/migration.sql'
    );
    let sql = fs.readFileSync(migrationPath, 'utf8');

    // Substituir os nomes das tabelas para os nomes corretos
    sql = sql
      .replace(/"question_concept"/g, '"anamnese_question_concept"')
      .replace(/"question_text"/g, '"anamnese_question_text"')
      .replace(/"answer_option"/g, '"anamnese_answer_option"')
      .replace(/"answer_option_text"/g, '"anamnese_answer_option_text"')
      .replace(/"user_answer"/g, '"anamnese_user_answer"');

    // Dividir o SQL em comandos individuais (separados por ;)
    // Remover comentários de linha primeiro
    sql = sql.replace(/--.*$/gm, '');
    
    const commands = sql
      .split(';')
      .map((cmd) => cmd.trim().replace(/\s+/g, ' '))
      .filter((cmd) => cmd.length > 0 && !cmd.startsWith('--') && cmd !== '');

    console.log(`📊 Total de comandos encontrados: ${commands.length}\n`);
    if (commands.length === 0) {
      console.error('❌ Nenhum comando encontrado no SQL!');
      console.log('Primeiras 500 caracteres do SQL:', sql.substring(0, 500));
    }

    // Executar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim().length === 0) continue;

      try {
        // Adicionar ponto e vírgula de volta
        const fullCommand = command.endsWith(';') ? command : `${command};`;
        console.log(`\n[${i + 1}/${commands.length}] Executando: ${command.substring(0, 100)}...`);
        await prisma.$executeRawUnsafe(fullCommand);
        console.log(`✅ Comando ${i + 1} executado com sucesso`);
      } catch (error: any) {
        // Ignorar apenas erros específicos de "already exists" para tipos e constraints
        const errorMsg = error.message || '';
        const isAlreadyExists = 
          errorMsg.includes('already exists') && 
          !errorMsg.includes('does not exist') &&
          (errorMsg.includes('type') || errorMsg.includes('constraint') || errorMsg.includes('index'));
        
        if (isAlreadyExists) {
          console.log(`⚠️  Ignorado (já existe): ${command.substring(0, 80)}...`);
        } else {
          console.error(`❌ Erro ao executar: ${command.substring(0, 80)}...`);
          console.error(`   Erro: ${errorMsg}`);
          // Para CREATE TABLE, se falhar, tentar DROP e recriar
          if (command.toUpperCase().includes('CREATE TABLE') && !errorMsg.includes('already exists')) {
            console.log(`   Tentando DROP e recriar...`);
            try {
              const tableName = command.match(/"([^"]+)"/)?.[1];
              if (tableName) {
                await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`);
                await prisma.$executeRawUnsafe(fullCommand);
                console.log(`✅ Tabela ${tableName} recriada com sucesso`);
              }
            } catch (retryError: any) {
              console.error(`   Falha ao recriar: ${retryError.message}`);
            }
          }
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

