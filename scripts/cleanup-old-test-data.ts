import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script para limpar dados de teste antigos que não têm o sufixo -system-test
 * ATENÇÃO: Este script deleta dados que parecem ser de teste
 */
async function cleanupOldTestData() {
  try {
    console.log('🧹 Limpando dados de teste antigos...\n');

    // Padrões para identificar dados de teste antigos
    const testPatterns = [
      'test',
      'Test',
      'TEST',
      'Test Product',
      'Test User',
      'Test Activity',
      'Single Product',
      'Stock Product',
      'Delete Product',
      'Original Product',
      'Updated Product',
      'Categorized Product',
      'Product 1',
      'Product 2',
      'Order List Product',
      'Single Order Product',
      'Update Order Product',
      'Cancel Order Product',
      'Delete Order Product',
      'Payment Test Product',
      'Stock Test Product',
      'Stock Revert Test Product',
      'Authorized Payment Product',
      'Refused Payment Product',
      'Transaction ID Test Product',
      'Subtract Stock Product',
      'Set Stock Product',
      'Validation Product',
      'test-',
      '@example.com',
    ];

    let totalDeleted = 0;

    // Limpar produtos de teste antigos
    console.log('📦 Limpando produtos de teste...');
    const testProducts = await prisma.product.findMany({
      where: {
        OR: testPatterns.map(pattern => ({
          name: { contains: pattern, mode: 'insensitive' },
        })),
      },
    });

    if (testProducts.length > 0) {
      console.log(`   Encontrados ${testProducts.length} produtos de teste`);
      
      // Verificar se há pedidos relacionados
      const productIds = testProducts.map(p => p.id);
      const ordersWithProducts = await prisma.orderItem.findMany({
        where: { productId: { in: productIds } },
        select: { orderId: true },
      });
      
      if (ordersWithProducts.length > 0) {
        const orderIds = [...new Set(ordersWithProducts.map(o => o.orderId))];
        console.log(`   Deletando ${orderIds.length} pedidos relacionados...`);
        
        // Deletar order items primeiro
        await prisma.orderItem.deleteMany({
          where: { productId: { in: productIds } },
        });
        
        // Deletar orders
        await prisma.order.deleteMany({
          where: { id: { in: orderIds } },
        });
        totalDeleted += orderIds.length;
      }
      
      // Deletar produtos
      await prisma.product.deleteMany({
        where: { id: { in: productIds } },
      });
      totalDeleted += testProducts.length;
      console.log(`   ✅ ${testProducts.length} produtos deletados`);
    } else {
      console.log('   Nenhum produto de teste encontrado');
    }

    // Limpar atividades de teste antigas
    console.log('\n📅 Limpando atividades de teste...');
    const testActivities = await prisma.activity.findMany({
      where: {
        OR: testPatterns.map(pattern => ({
          name: { contains: pattern, mode: 'insensitive' },
        })),
      },
    });

    if (testActivities.length > 0) {
      await prisma.activity.deleteMany({
        where: { id: { in: testActivities.map(a => a.id) } },
      });
      totalDeleted += testActivities.length;
      console.log(`   ✅ ${testActivities.length} atividades deletadas`);
    } else {
      console.log('   Nenhuma atividade de teste encontrada');
    }

    // Limpar usuários de teste antigos (com padrões de teste no username)
    console.log('\n👤 Limpando usuários de teste...');
    const testUsers = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: '@example.com' } },
          { username: { startsWith: 'test_' } },
          { username: { startsWith: 'testuser_' } },
          { username: { contains: '_test_' } },
          { username: { contains: '_recipient_' } },
          { username: { contains: '_split_' } },
        ],
      },
      include: {
        person: true,
      },
    });

    if (testUsers.length > 0) {
      const userIds = testUsers.map(u => u.id);
      const personIds = testUsers.map(u => u.personId).filter(Boolean);
      
      // Deletar respostas de anamnese relacionadas
      const anamneseAnswers = await prisma.anamnesisUserAnswer.findMany({
        where: { userId: { in: userIds } },
      });
      if (anamneseAnswers.length > 0) {
        await prisma.anamnesisUserAnswer.deleteMany({
          where: { userId: { in: userIds } },
        });
        console.log(`   Deletadas ${anamneseAnswers.length} respostas de anamnese`);
      }
      
      // Deletar atividades relacionadas
      const userActivities = await prisma.activity.findMany({
        where: { userId: { in: userIds } },
      });
      if (userActivities.length > 0) {
        await prisma.activity.deleteMany({
          where: { userId: { in: userIds } },
        });
        console.log(`   Deletadas ${userActivities.length} atividades relacionadas`);
      }
      
      // Deletar pedidos relacionados
      const userOrders = await prisma.order.findMany({
        where: { userId: { in: userIds } },
      });
      if (userOrders.length > 0) {
        const orderIds = userOrders.map(o => o.id);
        await prisma.orderItem.deleteMany({
          where: { orderId: { in: orderIds } },
        });
        await prisma.order.deleteMany({
          where: { id: { in: orderIds } },
        });
        console.log(`   Deletados ${userOrders.length} pedidos relacionados`);
      }
      
      // Deletar contatos relacionados
      if (personIds.length > 0) {
        await prisma.personContact.deleteMany({
          where: { personId: { in: personIds } },
        });
      }
      
      // Deletar usuários
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
      
      // Deletar pessoas
      if (personIds.length > 0) {
        await prisma.person.deleteMany({
          where: { id: { in: personIds } },
        });
      }
      
      totalDeleted += testUsers.length;
      console.log(`   ✅ ${testUsers.length} usuários de teste deletados`);
    } else {
      console.log('   Nenhum usuário de teste encontrado');
    }

    // Limpar perguntas de teste antigas da anamnese (apenas com prefixo -system-test)
    console.log('\n❓ Limpando perguntas de teste da anamnese...');
    const TEST_ID_PREFIX = '-system-test';
    
    // Buscar perguntas que contenham o prefixo de teste
    const testQuestions = await prisma.anamnesisQuestionConcept.findMany({
      where: {
        key: { contains: TEST_ID_PREFIX },
      },
    });

    if (testQuestions.length > 0) {
      const questionIds = testQuestions.map(q => q.id);
      
      // Deletar respostas relacionadas
      const questionAnswers = await prisma.anamnesisUserAnswer.findMany({
        where: { questionConceptId: { in: questionIds } },
      });
      if (questionAnswers.length > 0) {
        await prisma.anamnesisUserAnswer.deleteMany({
          where: { questionConceptId: { in: questionIds } },
        });
        console.log(`   Deletadas ${questionAnswers.length} respostas relacionadas`);
      }
      
      // Buscar opções de resposta
      const answerOptions = await prisma.anamnesisAnswerOption.findMany({
        where: { questionConceptId: { in: questionIds } },
      });
      const optionIds = answerOptions.map(o => o.id);
      
      if (optionIds.length > 0) {
        // Deletar textos das opções
        await prisma.anamnesisAnswerOptionText.deleteMany({
          where: { answerOptionId: { in: optionIds } },
        });
        
        // Deletar opções
        await prisma.anamnesisAnswerOption.deleteMany({
          where: { id: { in: optionIds } },
        });
        console.log(`   Deletadas ${answerOptions.length} opções de resposta`);
      }
      
      // Deletar textos das perguntas
      await prisma.anamnesisQuestionText.deleteMany({
        where: { questionConceptId: { in: questionIds } },
      });
      
      // Deletar perguntas
      await prisma.anamnesisQuestionConcept.deleteMany({
        where: { id: { in: questionIds } },
      });
      
      totalDeleted += testQuestions.length;
      console.log(`   ✅ ${testQuestions.length} perguntas de teste deletadas`);
    } else {
      console.log('   Nenhuma pergunta de teste encontrada');
    }

    console.log(`\n✅ Limpeza concluída! Total de registros deletados: ${totalDeleted}`);
  } catch (error) {
    console.error('\n❌ Erro ao limpar dados de teste:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Confirmar antes de executar
const args = process.argv.slice(2);
if (args.includes('--confirm')) {
  cleanupOldTestData();
} else {
  console.log('⚠️  ATENÇÃO: Este script vai deletar dados de teste antigos!');
  console.log('   Para executar, adicione o flag --confirm:');
  console.log('   npx ts-node -r tsconfig-paths/register scripts/cleanup-old-test-data.ts --confirm\n');
  process.exit(0);
}

