import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar objetivos pessoais pré-definidos
  const objectives = [
    { name: 'Get to know me better', order: 1 },
    { name: 'Improve my habits', order: 2 },
    { name: 'Find wellbeing programs', order: 3 },
    { name: 'Improve my sleep', order: 4 },
    { name: 'Gain insights on my wellbeing', order: 5 },
    { name: 'Eat better', order: 6 },
    { name: 'Buy health products', order: 7 },
    { name: 'Find a comunity', order: 8 },
    { name: 'Track my treatment/program', order: 9 },
    { name: 'Move more', order: 10 },
    { name: 'Track my mood', order: 11 },
  ];

  console.log('📋 Criando objetivos pessoais...');

  for (const objective of objectives) {
    await prisma.personalObjective.upsert({
      where: { name: objective.name },
      update: {
        order: objective.order,
      },
      create: {
        name: objective.name,
        order: objective.order,
      },
    });
  }

  console.log('✅ Objetivos pessoais criados');

  console.log('🎉 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
