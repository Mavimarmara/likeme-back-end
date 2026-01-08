/**
 * Script para adicionar 3 produtos no banco de dados
 * Execute: npx ts-node -r tsconfig-paths/register scripts/add-products.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🛍️  Adicionando 3 produtos no banco de dados...\n');

  const products = [
    {
      name: 'Suplemento de Vitamina D3',
      description: 'Suplemento de vitamina D3 de alta qualidade, 60 cápsulas. Ideal para fortalecer o sistema imunológico e melhorar a saúde óssea.',
      price: 49.90,
      quantity: 50,
      category: 'supplements',
      brand: 'HealthPlus',
      status: 'active',
      sku: 'SUP-VIT-D3-001',
    },
    {
      name: 'Kit de Halteres Ajustáveis',
      description: 'Par de halteres ajustáveis de 2,5kg a 20kg cada. Perfeito para treinos em casa. Inclui barra e discos.',
      price: 299.90,
      quantity: 15,
      category: 'equipment',
      brand: 'FitPro',
      status: 'active',
      sku: 'EQP-HALT-001',
    },
    {
      name: 'Curso Online: Nutrição Esportiva',
      description: 'Curso completo de nutrição esportiva com 40 horas de conteúdo. Inclui certificado e materiais de apoio.',
      price: 199.90,
      quantity: null, // Produto digital, sem estoque físico
      category: 'courses',
      brand: 'EduFit',
      status: 'active',
      sku: 'CRS-NUT-001',
    },
  ];

  for (const productData of products) {
    try {
      // Verificar se o SKU já existe
      if (productData.sku) {
        const existing = await prisma.product.findUnique({
          where: { sku: productData.sku },
        });

        if (existing) {
          console.log(`⚠️  Produto com SKU ${productData.sku} já existe. Pulando...`);
          continue;
        }
      }

      const product = await prisma.product.create({
        data: {
          name: productData.name,
          description: productData.description,
          price: productData.price,
          quantity: productData.quantity,
          category: productData.category,
          brand: productData.brand,
          status: productData.status,
          sku: productData.sku,
        },
      });

      console.log(`✅ Produto criado: ${product.name} (ID: ${product.id})`);
      console.log(`   Preço: R$ ${product.price}`);
      console.log(`   Estoque: ${product.quantity ?? 'Ilimitado'}`);
      console.log(`   SKU: ${product.sku}\n`);
    } catch (error: any) {
      console.error(`❌ Erro ao criar produto ${productData.name}:`, error.message);
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

