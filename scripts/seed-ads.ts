import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📢 Criando anúncios para os produtos cadastrados...\n');

  // Buscar ou criar um advertiser padrão
  let advertiser = await prisma.advertiser.findFirst({
    where: { deletedAt: null },
    include: { user: true },
  });

  if (!advertiser) {
    // Buscar o primeiro usuário disponível
    const firstUser = await prisma.user.findFirst({
      where: { deletedAt: null, isActive: true },
    });

    if (firstUser) {
      try {
        advertiser = await prisma.advertiser.create({
          data: {
            userId: firstUser.id,
            name: 'LikeMe Marketplace',
            description: 'Plataforma oficial de produtos e programas de bem-estar LikeMe',
            status: 'active',
            contactEmail: 'marketplace@likeme.com',
            website: 'https://likeme.com',
          },
          include: { user: true },
        });
        console.log('✅ Anunciante padrão criado');
      } catch (error: any) {
        // Se já existe um advertiser para este usuário, buscar ele
        if (error.code === 'P2002') {
          advertiser = await prisma.advertiser.findUnique({
            where: { userId: firstUser.id },
            include: { user: true },
          });
          console.log('✅ Anunciante padrão encontrado');
        } else {
          console.warn('⚠️  Não foi possível criar anunciante, criando anúncios sem anunciante (advertiserId opcional)');
        }
      }
    } else {
      console.warn('⚠️  Nenhum usuário encontrado, criando anúncios sem anunciante (advertiserId opcional)');
    }
  } else {
    console.log('✅ Anunciante padrão encontrado');
  }

  // Buscar todos os produtos ativos
  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      status: 'active',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (products.length === 0) {
    console.log('⚠️  Nenhum produto encontrado. Execute primeiro o seed de produtos: npm run db:seed:products');
    return;
  }

  console.log(`📦 Encontrados ${products.length} produtos\n`);

  // Mapear tipo do produto para o anúncio
  const getAdType = (productType: string | null | undefined): 'amazon product' | 'physical product' | 'program' => {
    if (!productType) return 'program';
    const t = productType.toLowerCase();
    if (t === 'program') return 'program';
    if (t === 'amazon product') return 'amazon product';
    return 'physical product';
  };

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const product of products) {
    try {
      const productType = getAdType(product.type);

      if (!product.type) {
        await prisma.product.update({
          where: { id: product.id },
          data: { type: productType },
        });
      }

      // Verificar se já existe um anúncio para este produto
      const existingAd = await prisma.ad.findFirst({
        where: {
          productId: product.id,
          deletedAt: null,
        },
      });

      const adData = {
        advertiserId: advertiser?.id || null,
        productId: product.id,
        status: 'active' as const,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 dias a partir de hoje
        targetAudience: product.type || 'General audience',
      };

      if (existingAd) {
        // Atualizar anúncio existente
        await prisma.ad.update({
          where: { id: existingAd.id },
          data: adData,
        });
        updated++;
        console.log(`🔄 Atualizado: ${product.name}`);
      } else {
        // Criar novo anúncio
        await prisma.ad.create({
          data: adData,
          include: {
            advertiser: true,
            product: true,
          },
        });
        created++;
        console.log(`✅ Criado: ${product.name}`);
      }
    } catch (error: any) {
      errors++;
      console.error(`❌ Erro ao criar anúncio para ${product.name}:`, error.message);
    }
  }

  console.log('\n📊 Resumo:');
  console.log(`  ✅ Criados: ${created}`);
  console.log(`  🔄 Atualizados: ${updated}`);
  console.log(`  ❌ Erros: ${errors}`);
  console.log(`  📦 Total processados: ${products.length}`);
  console.log('\n🎉 Processo concluído!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed de anúncios:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
