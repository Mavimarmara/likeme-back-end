/**
 * Lista perguntas no banco por prefixo para identificar quais não aparecem no app.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const questions = await prisma.anamnesisQuestionConcept.findMany({
    where: { deletedAt: null },
    select: { key: true },
    orderBy: { key: 'asc' },
  });

  const prefixes: Record<string, string[]> = {};
  for (const q of questions) {
    const prefix = q.key.split('_')[0] || q.key.substring(0, 20);
    if (!prefixes[prefix]) prefixes[prefix] = [];
    prefixes[prefix].push(q.key);
  }

  console.log('=== PERGUNTAS NO BANCO (por prefixo) ===\n');
  for (const [prefix, keys] of Object.entries(prefixes).sort()) {
    console.log(`${prefix}: ${keys.length} perguntas`);
    keys.slice(0, 2).forEach((k) => console.log(`  - ${k.substring(0, 65)}${k.length > 65 ? '...' : ''}`));
    if (keys.length > 2) console.log(`  ... e mais ${keys.length - 2}`);
    console.log('');
  }

  console.log('=== O QUE O APP BUSCA ===\n');
  const mental = questions.filter((q) => q.key.startsWith('mental'));
  const physical = questions.filter((q) => q.key.startsWith('physical'));
  const mind = questions.filter((q) => q.key.startsWith('mind_'));

  console.log('Mind screen: keyPrefix=mental');
  console.log(`  Retorna: ${mental.length} perguntas (key.startsWith("mental"))\n`);

  if (mind.length > 0) {
    console.log('⚠️  PERGUNTAS mind_* NÃO APARECEM no Mind screen!');
    console.log(`  "mind_".startsWith("mental") = false`);
    console.log(`  Total mind_* no banco: ${mind.length}`);
    mind.slice(0, 5).forEach((q) => console.log(`  - ${q.key}`));
    if (mind.length > 5) console.log(`  ... e mais ${mind.length - 5}`);
    console.log('');
  }

  console.log('Body screen: keyPrefix=physical');
  console.log(`  Retorna: ${physical.length} perguntas\n`);

  console.log('Habits - app busca (keyPrefix na home):');
  const habitsApp = ['habits_movimento', 'habits_espiritualidade', 'habits_sono', 'habits_nutricao', 'habits_estresse'];
  for (const p of habitsApp) {
    const count = questions.filter((q) => q.key.startsWith(p)).length;
    console.log(`  ${p}: ${count} perguntas`);
  }

  // Estrutura real das keys habits_* no banco
  const habitsQuestions = questions.filter((q) => q.key.startsWith('habits_'));
  const habitsSecondPart: Record<string, number> = {};
  for (const q of habitsQuestions) {
    const parts = q.key.split('_');
    const second = parts[1] || '?';
    habitsSecondPart[second] = (habitsSecondPart[second] || 0) + 1;
  }
  console.log('\nEstrutura real habits_* no banco (2ª parte da key):');
  Object.entries(habitsSecondPart)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  habits_${k}: ${v} perguntas`));

  console.log('\nExemplos de keys habits no banco:');
  habitsQuestions.slice(0, 8).forEach((q) => console.log(`  - ${q.key}`));

  // habitos (com o) vs habits (com s)
  const habitos = questions.filter((q) => q.key.startsWith('habitos_'));
  if (habitos.length > 0) {
    console.log('\n⚠️  PERGUNTAS habitos_* (com O) - app busca habits_* (com S)!');
    console.log(`  Total habitos_*: ${habitos.length}`);
    habitos.forEach((q) => console.log(`  - ${q.key}`));
  }

  console.log('\n=== RESUMO ===');
  console.log(`Total perguntas no banco: ${questions.length}`);
  console.log(`Mental (keyPrefix=mental): ${mental.length}`);
  console.log(`Mind_* (não buscadas): ${mind.length}`);
  console.log(`Physical: ${physical.length}`);
  const habitsTotal = questions.filter((q) => q.key.startsWith('habits_') || q.key.startsWith('habitos_')).length;
  console.log(`Habits total: ${habitsTotal}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
