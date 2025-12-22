import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    const migrationPath = path.join(__dirname, '../prisma/migrations/add_description_to_activity.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('📝 Aplicando migration: add_description_to_activity.sql');
    console.log('SQL:', sql);
    
    await prisma.$executeRawUnsafe(sql);
    
    console.log('✅ Migration aplicada com sucesso!');
  } catch (error: any) {
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log('ℹ️  Coluna description já existe na tabela activity');
    } else {
      console.error('❌ Erro ao aplicar migration:', error.message);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
