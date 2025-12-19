import prisma from '../src/config/database';

async function deleteTestAds() {
  console.log('🗑️  Iniciando remoção de ads de teste...\n');
  
  try {
    // Buscar ads que possam ser de teste
    // Padrões identificados dos testes: "Active Ad", "Inactive Ad", "Amazon Product Ad", 
    // "Ad With Product", "Ad Without Product", "Test Ad", "New Amazon Ad", "New Product Ad"
    
    const ads = await prisma.ad.findMany({
      where: {
        OR: [
          // Buscar por padrões específicos identificados nos testes
          { title: { contains: 'Active Ad', mode: 'insensitive' } },
          { title: { contains: 'Inactive Ad', mode: 'insensitive' } },
          { title: { contains: 'Amazon Product Ad', mode: 'insensitive' } },
          { title: { contains: 'Ad With Product', mode: 'insensitive' } },
          { title: { contains: 'Ad Without Product', mode: 'insensitive' } },
          { title: { contains: 'Ad With Invalid URL', mode: 'insensitive' } },
          { title: { contains: 'Test Ad', mode: 'insensitive' } },
          { title: { contains: 'New Amazon Ad', mode: 'insensitive' } },
          { title: { contains: 'New Product Ad', mode: 'insensitive' } },
          // Buscar por padrões genéricos
          { title: { contains: 'test', mode: 'insensitive' } },
          { description: { contains: 'test', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });

    if (ads.length === 0) {
      console.log('   ✓ Nenhum ad de teste encontrado');
      return;
    }

    console.log(`   📋 Encontrados ${ads.length} ads de teste:`);
    ads.forEach((ad) => {
      console.log(`      - ${ad.title} (${ad.id}) [${ad.status}]`);
    });

    // Deletar os ads encontrados
    const result = await prisma.ad.deleteMany({
      where: {
        id: { in: ads.map((ad) => ad.id) },
      },
    });

    console.log(`\n   ✅ ${result.count} ads de teste deletados com sucesso!`);
  } catch (error) {
    console.error('❌ Erro ao deletar ads de teste:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  deleteTestAds()
    .then(() => {
      console.log('\n🎉 Script finalizado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erro ao executar script:', error);
      process.exit(1);
    });
}

export default deleteTestAds;
