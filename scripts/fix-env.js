const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'qiwvqwidzdnizgjvudcs';
const PASSWORD = 'rcQ3L7?mV4?ws?-';
const ENCODED_PASSWORD = encodeURIComponent(PASSWORD);

const NEW_DATABASE_URL = `postgresql://postgres.${PROJECT_REF}:${ENCODED_PASSWORD}@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`;
const NEW_DIRECT_URL = `postgresql://postgres.${PROJECT_REF}:${ENCODED_PASSWORD}@aws-1-us-east-1.pooler.supabase.com:5432/postgres`;

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

