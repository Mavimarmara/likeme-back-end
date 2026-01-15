const fs = require('fs');
const path = require('path');

/**
 * Script para atualizar DATABASE_URL e DIRECT_URL no .env usando variáveis de ambiente.
 *
 * Uso:
 *   SUPABASE_PROJECT_REF=xxxx SUPABASE_DB_PASSWORD=yyyy node scripts/fix-env.js
 *
 * Opcional:
 *   SUPABASE_POOLER_HOST=aws-1-us-east-1.pooler.supabase.com
 */

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const POOLER_HOST = process.env.SUPABASE_POOLER_HOST || 'aws-1-us-east-1.pooler.supabase.com';

if (!PROJECT_REF || !PASSWORD) {
  console.error('❌ Variáveis obrigatórias ausentes: SUPABASE_PROJECT_REF e/ou SUPABASE_DB_PASSWORD');
  process.exit(1);
}

const ENCODED_PASSWORD = encodeURIComponent(PASSWORD);

const NEW_DATABASE_URL = `postgresql://postgres.${PROJECT_REF}:${ENCODED_PASSWORD}@${POOLER_HOST}:6543/postgres?pgbouncer=true&connection_limit=1`;
const NEW_DIRECT_URL = `postgresql://postgres.${PROJECT_REF}:${ENCODED_PASSWORD}@${POOLER_HOST}:5432/postgres`;

const envPath = path.join(__dirname, '..', '.env');
let content = fs.readFileSync(envPath, 'utf8');

const lines = content.split('\n');
const newLines = [];
let seenDb = false;
let seenDirect = false;

for (const line of lines) {
  if (line.startsWith('DATABASE_URL=')) {
    if (!seenDb) {
      newLines.push(`DATABASE_URL="${NEW_DATABASE_URL}"`);
      seenDb = true;
    }
  } else if (line.startsWith('DIRECT_URL=')) {
    if (!seenDirect) {
      newLines.push(`DIRECT_URL="${NEW_DIRECT_URL}"`);
      seenDirect = true;
    }
  } else {
    newLines.push(line);
  }
}

fs.writeFileSync(envPath, newLines.join('\n'));
console.log('✅ .env corrigido');
console.log(`DATABASE_URL="${NEW_DATABASE_URL.substring(0, 80)}..."`);

