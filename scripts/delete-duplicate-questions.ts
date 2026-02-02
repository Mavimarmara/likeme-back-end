import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteDuplicateQuestions() {
  console.log('🔍 Identificando perguntas duplicadas...\n');

  // IDs das perguntas duplicadas para deletar
  const duplicateIds = [
    // habitos_movimento_* (português antigo - deletar)
    'ab3434a2-0030-4f89-8d9b-ebb8b9b99b8f', // habitos_movimento_1
    'd7099a8a-edfc-43b5-8289-a756c57a7d9c', // habitos_movimento_2
    'dd0a7ffe-a557-4a52-a782-d1a935e34844', // habitos_movimento_3
    '0ec279c3-6b53-4061-84e9-3e0579487a02', // habitos_movimento_4
    
    // habits_movimento_* (mistura - deletar, manter habits_activity_*)
    '535a2e84-6229-4348-b8a3-544022904ca3', // habits_movimento_1
    '7b95d9c3-c484-4796-aad2-4d87cbc79a70', // habits_movimento_2
    '1d69d59d-0757-46df-971e-0e9c71e94b96', // habits_movimento_3
    '2d2b483b-de9b-4004-8f67-ae7c25858515', // habits_movimento_4
  ];

  console.log(`📋 Total de perguntas duplicadas a deletar: ${duplicateIds.length}\n`);

  // Busca as perguntas antes de deletar para confirmar
  const questionsToDelete = await prisma.anamnesisQuestionConcept.findMany({
    where: { id: { in: duplicateIds } },
    select: { id: true, key: true }
  });

  console.log('Perguntas que serão deletadas:');
  questionsToDelete.forEach(q => {
    console.log(`  - ${q.key} (${q.id})`);
  });

  console.log('\n🗑️  Deletando perguntas duplicadas...');

  // Soft delete (marca deletedAt)
  const result = await prisma.anamnesisQuestionConcept.updateMany({
    where: { id: { in: duplicateIds } },
    data: { deletedAt: new Date() }
  });

  console.log(`✅ ${result.count} perguntas marcadas como deletadas\n`);

  // Verifica as perguntas restantes
  const remainingQuestions = await prisma.anamnesisQuestionConcept.findMany({
    where: {
      deletedAt: null,
      key: {
        startsWith: 'habits_activity_'
      }
    },
    select: { key: true },
    orderBy: { key: 'asc' }
  });

  console.log(`📊 Perguntas habits_activity_ restantes: ${remainingQuestions.length}`);
  remainingQuestions.forEach(q => {
    console.log(`  - ${q.key}`);
  });

  await prisma.$disconnect();
  console.log('\n✨ Processo concluído!');
}

deleteDuplicateQuestions().catch((error) => {
  console.error('❌ Erro ao deletar perguntas duplicadas:', error);
  process.exit(1);
});
