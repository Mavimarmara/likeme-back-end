/**
 * Calcula e exibe os scores de anamnese (mental/physical) a partir das respostas no banco,
 * com o mesmo critério do AnamnesisService.getUserScores, para conferência.
 *
 * Uso:
 *   npx ts-node -r tsconfig-paths/register scripts/calc-anamnesis-scores.ts
 *   USER_ID=<uuid> npx ts-node -r tsconfig-paths/register scripts/calc-anamnesis-scores.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HABITS_MENTAL_DOMAINS = new Set([
  'espiritualidade', 'estresse', 'autoestima', 'proposito', 'purpose', 'spirituality', 'stress', 'self-esteem',
]);
const HABITS_PHYSICAL_DOMAINS = new Set([
  'movimento', 'sono', 'nutricao', 'saude_bucal', 'relacionamentos', 'activity', 'sleep', 'nutrition', 'smile', 'connection',
]);

function getQuestionCategory(key: string): 'mental' | 'physical' | null {
  const lower = key.toLowerCase();
  // Aceita mind_, mental*, body_, physical*, habits_*
  if (lower.startsWith('mind_') || lower.startsWith('mental')) return 'mental';
  if (lower.startsWith('body_') || lower.startsWith('physical')) return 'physical';
  const parts = lower.split('_');
  const prefix = parts[0];
  if (prefix === 'habits' && parts.length >= 2) {
    const domain = parts[1];
    if (HABITS_MENTAL_DOMAINS.has(domain)) return 'mental';
    if (HABITS_PHYSICAL_DOMAINS.has(domain)) return 'physical';
    return 'physical'; // fallback
  }
  return null;
}

function calculatePercentage(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((score / maxScore) * 100)));
}

async function getMaxScoresGlobal(): Promise<{ mental: number; physical: number; mentalQuestions: number; physicalQuestions: number }> {
  const questions = await prisma.anamnesisQuestionConcept.findMany({
    where: {
      deletedAt: null,
      OR: [
        { key: { startsWith: 'mind_' } },
        { key: { startsWith: 'mental' } },
        { key: { startsWith: 'body_' } },
        { key: { startsWith: 'physical' } },
        { key: { startsWith: 'habits_' } },
      ],
    },
    select: {
      id: true,
      key: true,
      answerOptions: { select: { value: true } },
    },
  });

  let mental = 0;
  let physical = 0;
  let mentalQuestions = 0;
  let physicalQuestions = 0;

  for (const q of questions) {
    const category = getQuestionCategory(q.key);
    if (!category) continue;
    const values = (q.answerOptions || [])
      .map((o) => parseFloat(o.value || '0'))
      .filter((v) => !isNaN(v));
    const maxVal = values.length ? Math.max(...values) : 0;
    if (category === 'mental') {
      mental += maxVal;
      mentalQuestions++;
    } else {
      physical += maxVal;
      physicalQuestions++;
    }
  }
  return { mental, physical, mentalQuestions, physicalQuestions };
}

async function main() {
  const userId = process.env.USER_ID?.trim();

  let userIds: string[];
  if (userId) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!u) {
      console.error('Usuário não encontrado:', userId);
      process.exit(1);
    }
    userIds = [userId];
  } else {
    const rows = await prisma.anamnesisUserAnswer.findMany({
      select: { userId: true },
      distinct: ['userId'],
    });
    userIds = rows.map((r) => r.userId);
    if (userIds.length === 0) {
      console.log('Nenhuma resposta de anamnese no banco.');
      return;
    }
  }

  const maxScores = await getMaxScoresGlobal();

  console.log('\n=== MÁXIMOS GLOBAIS (todas as perguntas de score no banco) ===');
  console.log(`Mental: ${maxScores.mentalQuestions} perguntas, máximo possível = ${maxScores.mental}`);
  console.log(`Physical: ${maxScores.physicalQuestions} perguntas, máximo possível = ${maxScores.physical}`);

  for (const uid of userIds) {
    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { id: true, username: true, personId: true },
    });
    const display = user?.username || user?.personId || uid;

    const answers = await prisma.anamnesisUserAnswer.findMany({
      where: { userId: uid },
      include: {
        questionConcept: { select: { id: true, key: true } },
        answerOption: { select: { key: true, value: true } },
      },
      orderBy: [{ questionConcept: { key: 'asc' } }],
    });

    console.log('\n' + '='.repeat(70));
    console.log(`USUÁRIO: ${display} (${uid})`);
    console.log('='.repeat(70));

    // Máximo possível considerando só as perguntas que este usuário respondeu
    const questionIds = [...new Set(answers.map((a) => a.questionConceptId))];
    const questionsForMax = await prisma.anamnesisQuestionConcept.findMany({
      where: { id: { in: questionIds } },
      select: {
        id: true,
        key: true,
        answerOptions: { select: { value: true } },
      },
    });

    let maxMentalUser = 0;
    let maxPhysicalUser = 0;
    let mentalQuestionsUser = 0;
    let physicalQuestionsUser = 0;

    for (const q of questionsForMax) {
      const category = getQuestionCategory(q.key);
      if (!category) continue;
      const values = (q.answerOptions || []).map((o) => parseFloat(o.value || '0')).filter((v) => !isNaN(v));
      const maxVal = values.length ? Math.max(...values) : 0;
      if (category === 'mental') {
        maxMentalUser += maxVal;
        mentalQuestionsUser++;
      } else {
        maxPhysicalUser += maxVal;
        physicalQuestionsUser++;
      }
    }

    console.log(`\nPerguntas respondidas: Mental=${mentalQuestionsUser}, Physical=${physicalQuestionsUser}`);
    console.log(`Máximo (só suas perguntas): Mental=${maxMentalUser}, Physical=${maxPhysicalUser}`);

    const rows: { key: string; value: number; maxValue: number; category: string }[] = [];
    let mental = 0;
    let physical = 0;

    for (const a of answers) {
      if (!a.answerOptionId || !a.answerOption) continue;
      const value = parseFloat(a.answerOption.value || '0');
      if (isNaN(value)) continue;
      const category = getQuestionCategory(a.questionConcept.key);
      if (!category) continue;

      // Encontrar valor máximo dessa pergunta
      const qForMax = questionsForMax.find((q) => q.id === a.questionConceptId);
      const maxVal = qForMax
        ? Math.max(...(qForMax.answerOptions || []).map((o) => parseFloat(o.value || '0')).filter((v) => !isNaN(v)), 0)
        : 0;

      rows.push({
        key: a.questionConcept.key,
        value,
        maxValue: maxVal,
        category,
      });
      if (category === 'mental') mental += value;
      else physical += value;
    }

    console.log('\n--- RESPOSTAS DETALHADAS ---');
    console.log('Pergunta (key)                                       | valor | máx | categoria');
    console.log('-'.repeat(85));
    for (const r of rows) {
      const keyTrunc = r.key.length > 50 ? r.key.substring(0, 47) + '...' : r.key.padEnd(50);
      console.log(`${keyTrunc} | ${String(r.value).padStart(5)} | ${String(r.maxValue).padStart(3)} | ${r.category}`);
    }
    console.log('-'.repeat(85));

    console.log(`\n--- SOMA ---`);
    console.log(`Mental: ${mental} de ${maxMentalUser} (${calculatePercentage(mental, maxMentalUser)}% sobre suas perguntas)`);
    console.log(`Physical: ${physical} de ${maxPhysicalUser} (${calculatePercentage(physical, maxPhysicalUser)}% sobre suas perguntas)`);

    console.log(`\n--- PORCENTAGEM GLOBAL (como o backend calcula) ---`);
    console.log(`Mental: ${mental} de ${maxScores.mental} = ${calculatePercentage(mental, maxScores.mental)}%`);
    console.log(`Physical: ${physical} de ${maxScores.physical} = ${calculatePercentage(physical, maxScores.physical)}%`);

    if (mentalQuestionsUser < maxScores.mentalQuestions || physicalQuestionsUser < maxScores.physicalQuestions) {
      console.log(`\n⚠️  ATENÇÃO: Você não respondeu todas as perguntas!`);
      console.log(`   Mental: respondeu ${mentalQuestionsUser} de ${maxScores.mentalQuestions} perguntas`);
      console.log(`   Physical: respondeu ${physicalQuestionsUser} de ${maxScores.physicalQuestions} perguntas`);
    }
  }

  console.log('\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
