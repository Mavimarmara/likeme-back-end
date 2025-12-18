import prisma from '../src/config/database';

/**
 * Script para limpar dados de teste do banco de dados
 * Remove dados criados durante os testes (emails com padrão de teste, etc)
 */
async function cleanupTestData() {
  console.log('🧹 Iniciando limpeza de dados de teste...\n');

  try {
    // Padrões para identificar dados de teste
    const testEmailPattern = /test|noadvertiser|deletetest|testuser|testtoken|testadvertiser/i;
    const testNamePattern = /^Test|^Delete|^User[12]|^No|^Original|^Single|^Stock Test|^Order List|^Cancel Order|^Update Order|^Delete Order|^Delete Product|^Validation Product|^Subtract Stock|^Set Stock|^Categorized Product|^Product [12]$|^Active Ad|^Inactive Ad|^Amazon Product Ad|^Ad With|^Ad Without|^New Amazon Ad|^New Product Ad/i;

    let deletedCount = 0;

    // 1. Deletar OrderItems
    console.log('🗑️  Limpando OrderItems...');
    const orderItems = await prisma.orderItem.findMany({
      include: { order: { include: { user: true } } },
    });
    
    const testOrderItemIds = orderItems
      .filter(item => {
        const user = item.order?.user;
        return user && testEmailPattern.test(user.username || '');
      })
      .map(item => item.id);

    if (testOrderItemIds.length > 0) {
      const deleted = await prisma.orderItem.deleteMany({
        where: { id: { in: testOrderItemIds } },
      });
      deletedCount += deleted.count;
      console.log(`   ✓ ${deleted.count} OrderItems deletados`);
    } else {
      console.log('   ✓ Nenhum OrderItem de teste encontrado');
    }

    // 2. Deletar Orders
    console.log('🗑️  Limpando Orders...');
    const orders = await prisma.order.findMany({
      include: { user: true },
    });

    const testOrderIds = orders
      .filter(order => {
        const user = order.user;
        return user && testEmailPattern.test(user.username || '');
      })
      .map(order => order.id);

    if (testOrderIds.length > 0) {
      const deleted = await prisma.order.deleteMany({
        where: { id: { in: testOrderIds } },
      });
      deletedCount += deleted.count;
      console.log(`   ✓ ${deleted.count} Orders deletados`);
    } else {
      console.log('   ✓ Nenhum Order de teste encontrado');
    }

    // 3. Deletar Ads
    console.log('🗑️  Limpando Ads...');
    const ads = await prisma.ad.findMany({
      include: { advertiser: { include: { user: true } } },
    });

    const testAdIds = ads
      .filter(ad => {
        const advertiser = ad.advertiser;
        const user = advertiser?.user;
        return (
          (user && testEmailPattern.test(user.username || '')) ||
          (ad.title && testNamePattern.test(ad.title))
        );
      })
      .map(ad => ad.id);

    if (testAdIds.length > 0) {
      const deleted = await prisma.ad.deleteMany({
        where: { id: { in: testAdIds } },
      });
      deletedCount += deleted.count;
      console.log(`   ✓ ${deleted.count} Ads deletados`);
    } else {
      console.log('   ✓ Nenhum Ad de teste encontrado');
    }

    // 4. Deletar Products
    console.log('🗑️  Limpando Products...');
    const products = await prisma.product.findMany();

    const testProductIds = products
      .filter(product => product.name && testNamePattern.test(product.name))
      .map(product => product.id);

    if (testProductIds.length > 0) {
      const deleted = await prisma.product.deleteMany({
        where: { id: { in: testProductIds } },
      });
      deletedCount += deleted.count;
      console.log(`   ✓ ${deleted.count} Products deletados`);
    } else {
      console.log('   ✓ Nenhum Product de teste encontrado');
    }

    // 5. Deletar Advertisers
    console.log('🗑️  Limpando Advertisers...');
    const advertisers = await prisma.advertiser.findMany({
      include: { user: true },
    });

    const testAdvertiserIds = advertisers
      .filter(advertiser => {
        const user = advertiser.user;
        return (
          (user && testEmailPattern.test(user.username || '')) ||
          (advertiser.name && testNamePattern.test(advertiser.name))
        );
      })
      .map(advertiser => advertiser.id);

    if (testAdvertiserIds.length > 0) {
      const deleted = await prisma.advertiser.deleteMany({
        where: { id: { in: testAdvertiserIds } },
      });
      deletedCount += deleted.count;
      console.log(`   ✓ ${deleted.count} Advertisers deletados`);
    } else {
      console.log('   ✓ Nenhum Advertiser de teste encontrado');
    }

    // 6. Deletar PersonContacts
    console.log('🗑️  Limpando PersonContacts...');
    const personContacts = await prisma.personContact.findMany({
      include: { person: { include: { user: true } } },
    });

    const testContactIds = personContacts
      .filter(contact => {
        const person = contact.person;
        const user = person?.user; // Person tem apenas um user
        return (
          (user && testEmailPattern.test(user.username || '')) ||
          (contact.value && testEmailPattern.test(contact.value))
        );
      })
      .map(contact => contact.id);

    if (testContactIds.length > 0) {
      const deleted = await prisma.personContact.deleteMany({
        where: { id: { in: testContactIds } },
      });
      deletedCount += deleted.count;
      console.log(`   ✓ ${deleted.count} PersonContacts deletados`);
    } else {
      console.log('   ✓ Nenhum PersonContact de teste encontrado');
    }

    // 7. Deletar Users
    console.log('🗑️  Limpando Users...');
    const users = await prisma.user.findMany();

    const testUserIds = users
      .filter(user => user.username && testEmailPattern.test(user.username))
      .map(user => user.id);

    if (testUserIds.length > 0) {
      const deleted = await prisma.user.deleteMany({
        where: { id: { in: testUserIds } },
      });
      deletedCount += deleted.count;
      console.log(`   ✓ ${deleted.count} Users deletados`);
    } else {
      console.log('   ✓ Nenhum User de teste encontrado');
    }

    // 8. Deletar Persons (que não estão mais vinculadas a users)
    console.log('🗑️  Limpando Persons...');
    const persons = await prisma.person.findMany({
      include: { user: true },
    });

    const testPersonIds = persons
      .filter(
        person =>
          !person.user &&
          (testNamePattern.test(person.firstName || '') ||
            testNamePattern.test(person.lastName || ''))
      )
      .map(person => person.id);

    if (testPersonIds.length > 0) {
      const deleted = await prisma.person.deleteMany({
        where: { id: { in: testPersonIds } },
      });
      deletedCount += deleted.count;
      console.log(`   ✓ ${deleted.count} Persons deletados`);
    } else {
      console.log('   ✓ Nenhuma Person de teste encontrada');
    }

    // 9. Deletar Tips de teste (se houver)
    console.log('🗑️  Limpando Tips...');
    try {
      const tips = await prisma.tip.findMany();
      const testTipIds = tips
        .filter(tip => tip.title && testNamePattern.test(tip.title))
        .map(tip => tip.id);

      if (testTipIds.length > 0) {
        const deleted = await prisma.tip.deleteMany({
          where: { id: { in: testTipIds } },
        });
        deletedCount += deleted.count;
        console.log(`   ✓ ${deleted.count} Tips deletados`);
      } else {
        console.log('   ✓ Nenhum Tip de teste encontrado');
      }
    } catch (error: any) {
      if (error.code === 'P2021') {
        console.log('   ⚠️  Tabela Tip não existe, pulando...');
      } else {
        throw error;
      }
    }

    console.log(`\n✅ Limpeza concluída! Total de registros deletados: ${deletedCount}`);
  } catch (error) {
    console.error('❌ Erro ao limpar dados de teste:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  cleanupTestData()
    .then(() => {
      console.log('\n🎉 Script finalizado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erro ao executar script:', error);
      process.exit(1);
    });
}

export default cleanupTestData;
