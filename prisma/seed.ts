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

  const tips = [
    {
      id: 'self-care-overload',
      title: 'So many tips and apps... and self care still feels confusing?',
      description: 'Everything that matters is in one place – from health trackers to wellbeing programs and a curated marketplace.',
      image: 'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?auto=format&fit=crop&w=720&q=80',
      order: 1,
    },
    {
      id: 'build-your-routine',
      title: 'Construa uma rotina com propósito',
      description: 'Organize metas semanais, acompanhe seu sono, alimentação e atividades físicas sem complicação.',
      image: 'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=720&q=80',
      order: 2,
    },
    {
      id: 'find-your-community',
      title: 'Encontre apoio na comunidade',
      description: 'Compartilhe avanços, troque experiências e participe de desafios que incentivam hábitos saudáveis.',
      image: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=720&q=80',
      order: 3,
    },
  ];

  console.log('💡 Criando dicas iniciais...');

  for (const tip of tips) {
    await prisma.tip.upsert({
      where: { id: tip.id },
      update: {
        title: tip.title,
        description: tip.description,
        image: tip.image,
        order: tip.order,
      },
      create: tip,
    });
  }

  console.log('✅ Dicas criadas');

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
