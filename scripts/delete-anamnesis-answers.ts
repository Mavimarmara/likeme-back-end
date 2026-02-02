/**
 * Remove respostas de anamnese do banco.
 *
 * Uso:
 *   USER_ID=<uuid-do-usuario> npx ts-node -r tsconfig-paths/register scripts/delete-anamnesis-answers.ts
 *
 * Para remover TODAS as respostas (cuidado em produção):
 *   DELETE_ALL=1 npx ts-node -r tsconfig-paths/register scripts/delete-anamnesis-answers.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = process.env.USER_ID?.trim();
  const deleteAll = process.env.DELETE_ALL === '1' || process.env.DELETE_ALL === 'true';

  if (!userId && !deleteAll) {
    console.error('Uso:');
    console.error('  USER_ID=<uuid> npx ts-node -r tsconfig-paths/register scripts/delete-anamnesis-answers.ts');
    console.error('  DELETE_ALL=1 npx ts-node -r tsconfig-paths/register scripts/delete-anamnesis-answers.ts');
    process.exit(1);
  }

  const where = userId ? { userId } : {};

  const count = await prisma.anamnesisUserAnswer.count({ where });
  if (count === 0) {
    console.log('Nenhuma resposta de anamnese encontrada.');
    return;
  }

  await prisma.anamnesisUserAnswer.deleteMany({ where });
  console.log(`Removidas ${count} resposta(s) de anamnese.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
