import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_ID_PREFIX = '-system-test';

interface TableCounts {
  [key: string]: number;
}

async function countTestData(): Promise<TableCounts> {
  const counts: TableCounts = {
    persons: await prisma.person.count({ 
      where: { id: { contains: TEST_ID_PREFIX } } 
    }),
    personContacts: await prisma.personContact.count({ 
      where: { id: { contains: TEST_ID_PREFIX } } 
    }),
    users: await prisma.user.count({ 
      where: { 
        OR: [
          { id: { contains: TEST_ID_PREFIX } },
          { username: { contains: '@example.com' } }
        ]
      } 
    }),
    products: await prisma.product.count({ 
      where: { 
        OR: [
          { id: { contains: TEST_ID_PREFIX } },
          { name: { contains: 'Test', mode: 'insensitive' } }
        ]
      } 
    }),
    orders: await prisma.order.count({ 
      where: { id: { contains: TEST_ID_PREFIX } } 
    }),
    orderItems: await prisma.orderItem.count({ 
      where: { id: { contains: TEST_ID_PREFIX } } 
    }),
    activities: await prisma.activity.count({ 
      where: { 
        OR: [
          { id: { contains: TEST_ID_PREFIX } },
          { name: { contains: 'Test', mode: 'insensitive' } }
        ]
      } 
    }),
    ads: await prisma.ad.count({ 
      where: { id: { contains: TEST_ID_PREFIX } } 
    }),
    advertisers: await prisma.advertiser.count({ 
      where: { id: { contains: TEST_ID_PREFIX } } 
    }),
    anamnesisAnswers: await prisma.anamnesisUserAnswer.count({ 
      where: { id: { contains: TEST_ID_PREFIX } } 
    }),
    anamnesisQuestions: await prisma.anamnesisQuestionConcept.count({ 
      where: { key: { contains: TEST_ID_PREFIX } } 
    }),
  };

  return counts;
}

async function main() {
  try {
    const counts = await countTestData();
    
    // Output como JSON para fácil parsing na CI/CD
    console.log(JSON.stringify(counts, null, 2));
    
    // Calcular total
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    
    // Exit code baseado no resultado
    if (total > 0) {
      console.error(`\n⚠️  Encontrados ${total} registros de teste no banco!`);
      process.exit(1);
    } else {
      console.error('\n✅ Nenhum registro de teste encontrado.');
      process.exit(0);
    }
  } catch (error) {
    console.error('Erro ao contar dados de teste:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
