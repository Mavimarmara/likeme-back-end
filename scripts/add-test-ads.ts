/**
 * Script para adicionar anúncios de teste no banco de dados
 * Execute: npx ts-node -r tsconfig-paths/register scripts/add-test-ads.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📢 Adicionando anúncios de teste no banco de dados...\n');

  // Buscar ou criar um advertiser de teste
  let advertiser = await prisma.advertiser.findFirst({
    where: {
      deletedAt: null,
      status: 'active',
    },
  });

  if (!advertiser) {
    console.log('📋 Criando advertiser de teste...');
    
    // Buscar um usuário existente ou criar um de teste
    let user = await prisma.user.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
      },
      include: {
        person: true,
      },
    });

    if (!user) {
      // Criar usuário de teste
      const person = await prisma.person.create({
        data: {
          firstName: 'Advertiser',
          lastName: 'Test',
          nationalRegistration: '12345678901',
        },
      });

      user = await prisma.user.create({
        data: {
          personId: person.id,
          username: `advertiser.test.${Date.now()}@example.com`,
          password: 'hashed',
          isActive: true,
        },
        include: {
          person: true,
        },
      });
    }

    advertiser = await prisma.advertiser.create({
      data: {
        userId: user.id,
        name: 'Advertiser de Teste',
        description: 'Advertiser criado para testes de anúncios',
        contactEmail: 'advertiser@teste.com',
        status: 'active',
      },
    });

    console.log(`✅ Advertiser criado: ${advertiser.name} (ID: ${advertiser.id})\n`);
  } else {
    console.log(`✅ Usando advertiser existente: ${advertiser.name} (ID: ${advertiser.id})\n`);
  }

  // Buscar produtos existentes
  const allProducts = await prisma.product.findMany({
    where: {
      deletedAt: null,
      status: 'active',
    },
    include: {
      ads: {
        where: {
          deletedAt: null,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Filtrar apenas produtos que não têm anúncios
  const productsWithoutAds = allProducts
    .filter(product => product.ads.length === 0)
    .slice(0, 3);

  // Extrair apenas os dados do produto (sem a relação ads)
  const products = productsWithoutAds.map(({ ads, ...product }) => product);

  if (products.length === 0) {
    console.log('⚠️  Nenhum produto encontrado. Criando produtos de teste...\n');
    
    // Criar produtos de teste
    const testProducts = [
      {
        name: 'Produto Teste 1',
        description: 'Produto de teste para anúncio 1',
        price: 49.90,
        quantity: 10,
        category: 'physical product',
        status: 'active',
      },
      {
        name: 'Produto Teste 2',
        description: 'Produto de teste para anúncio 2',
        price: 99.90,
        quantity: 5,
        category: 'physical product',
        status: 'active',
      },
      {
        name: 'Produto Teste 3',
        description: 'Produto de teste para anúncio 3',
        price: 149.90,
        quantity: 3,
        category: 'physical product',
        status: 'active',
      },
    ];

    for (const productData of testProducts) {
      const product = await prisma.product.create({
        data: productData,
      });
      products.push(product);
      console.log(`✅ Produto criado: ${product.name} (ID: ${product.id})`);
    }
    console.log('');
  }

  // Criar anúncios de teste
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 1); // Começou ontem
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 30); // Termina em 30 dias

  const ads = [
    {
      advertiserId: advertiser.id,
      productId: products[0]?.id,
      startDate: startDate,
      endDate: endDate,
      status: 'active',
      targetAudience: 'Usuários interessados em saúde e bem-estar',
    },
    {
      advertiserId: advertiser.id,
      productId: products[1]?.id,
      startDate: startDate,
      endDate: endDate,
      status: 'active',
      targetAudience: 'Atletas e praticantes de exercícios',
    },
    {
      advertiserId: advertiser.id,
      productId: products[2]?.id,
      startDate: startDate,
      endDate: endDate,
      status: 'active',
      targetAudience: 'Pessoas buscando melhorar qualidade de vida',
    },
  ];

  for (const adData of ads) {
    try {
      if (!adData.productId) {
        console.log(`⚠️  Produto não disponível. Pulando...`);
        continue;
      }

      // Verificar se já existe um anúncio para este produto
      const existing = await prisma.ad.findFirst({
        where: {
          productId: adData.productId,
          advertiserId: adData.advertiserId,
          deletedAt: null,
        },
      });

      if (existing) {
        console.log(`⚠️  Anúncio já existe para o produto ${adData.productId}. Pulando...`);
        continue;
      }

      const ad = await prisma.ad.create({
        data: {
          advertiserId: adData.advertiserId,
          productId: adData.productId,
          startDate: adData.startDate,
          endDate: adData.endDate,
          status: adData.status,
          targetAudience: adData.targetAudience,
        },
        include: {
          product: true,
          advertiser: true,
        },
      });

      console.log(`✅ Anúncio criado: ${ad.product?.name || 'Produto sem nome'}`);
      console.log(`   ID: ${ad.id}`);
      console.log(`   Status: ${ad.status}`);
      console.log(`   Período: ${ad.startDate?.toLocaleDateString('pt-BR')} até ${ad.endDate?.toLocaleDateString('pt-BR')}`);
      console.log(`   Público-alvo: ${ad.targetAudience || 'Não especificado'}\n`);
    } catch (error: any) {
      console.error(`❌ Erro ao criar anúncio:`, error.message);
    }
  }

  console.log('✨ Concluído!');
}

main()
  .catch((error) => {
    console.error('Erro ao executar script:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

