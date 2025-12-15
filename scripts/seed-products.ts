import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🛍️ Cadastrando produtos de teste...');

  const products = [
    {
      name: 'Mental Health in the Workplace',
      description: 'Comprehensive program designed to promote mental health and well-being in professional environments. Learn strategies to manage stress, prevent burnout, and create a healthy work-life balance.',
      sku: 'PROD-MHW-001',
      price: 29.90,
      cost: 15.00,
      quantity: 50,
      image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800',
      category: 'Programs',
      brand: 'LikeMe Wellness',
      status: 'active' as const,
      weight: 0.5,
      dimensions: '20x15x3',
    },
    {
      name: 'Omega 3 Supplement',
      description: 'High-quality Omega-3 fatty acids supplement to support heart health, brain function, and overall well-being. Made from pure fish oil with no artificial additives.',
      sku: 'PROD-OMG-002',
      price: 150.99,
      cost: 80.00,
      quantity: 100,
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800',
      category: 'Medicine',
      brand: 'HealthPlus',
      status: 'active' as const,
      weight: 0.2,
      dimensions: '10x5x5',
    },
    {
      name: 'Melatonin Chocolate',
      description: 'Delicious dark chocolate infused with natural melatonin to help you achieve restful sleep. Contains 3mg of melatonin per serving.',
      sku: 'PROD-MEL-003',
      price: 10.50,
      cost: 5.00,
      quantity: 200,
      image: 'https://images.unsplash.com/photo-1519869325930-2812931507c0?w=800',
      category: 'Products',
      brand: 'Sweet Dreams',
      status: 'active' as const,
      weight: 0.1,
      dimensions: '15x10x2',
    },
    {
      name: 'Strategies to Relax',
      description: 'A comprehensive guide with proven techniques and exercises to help you relax and reduce stress in your daily life. Includes meditation, breathing exercises, and mindfulness practices.',
      sku: 'PROD-STR-004',
      price: 130.00,
      cost: 60.00,
      quantity: 30,
      image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
      category: 'Programs',
      brand: 'LikeMe Wellness',
      status: 'active' as const,
      weight: 0.3,
      dimensions: '25x20x2',
    },
    {
      name: 'How to Evolve to a Deep Sleep',
      description: 'Complete program teaching you how to achieve deep, restorative sleep. Learn about sleep hygiene, relaxation techniques, and natural sleep aids.',
      sku: 'PROD-DSP-005',
      price: 5.99,
      cost: 2.50,
      quantity: 150,
      image: 'https://images.unsplash.com/photo-1494390248081-4e521a5940db?w=800',
      category: 'Programs',
      brand: 'LikeMe Wellness',
      status: 'active' as const,
      weight: 0.2,
      dimensions: '20x15x1',
    },
    {
      name: 'Tongue Scraper',
      description: 'Professional-grade tongue scraper made from medical-grade stainless steel. Effectively removes bacteria and improves oral hygiene.',
      sku: 'PROD-TSC-006',
      price: 90.74,
      cost: 40.00,
      quantity: 75,
      image: 'https://images.unsplash.com/photo-1526404079165-74e4230b3109?w=800',
      category: 'Products',
      brand: 'OralCare Pro',
      status: 'active' as const,
      weight: 0.05,
      dimensions: '15x3x1',
    },
    {
      name: 'Where Balance Begins in Your Gut',
      description: 'Educational program focusing on gut health and its impact on overall well-being. Learn about probiotics, prebiotics, and digestive health.',
      sku: 'PROD-GUT-007',
      price: 55.45,
      cost: 25.00,
      quantity: 60,
      image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800',
      category: 'Programs',
      brand: 'LikeMe Wellness',
      status: 'active' as const,
      weight: 0.25,
      dimensions: '22x18x2',
    },
    {
      name: 'Nike Run Night - 5k to 10k',
      description: 'Running program designed to help you progress from 5k to 10k. Includes training plans, nutrition tips, and injury prevention strategies.',
      sku: 'PROD-RUN-008',
      price: 248.90,
      cost: 120.00,
      quantity: 40,
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
      category: 'Sports',
      brand: 'Nike Training',
      status: 'active' as const,
      weight: 0.4,
      dimensions: '25x20x2',
    },
    {
      name: 'Premium Yoga Mat',
      description: 'High-quality eco-friendly yoga mat with superior grip and cushioning. Perfect for all types of yoga and fitness activities.',
      sku: 'PROD-YGM-009',
      price: 89.90,
      cost: 45.00,
      quantity: 80,
      image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800',
      category: 'Products',
      brand: 'YogaZen',
      status: 'active' as const,
      weight: 1.2,
      dimensions: '180x60x0.6',
    },
    {
      name: 'Sleep Aid Essential Oil Blend',
      description: 'Aromatherapy essential oil blend specifically formulated to promote relaxation and sleep. Contains lavender, chamomile, and bergamot.',
      sku: 'PROD-EOI-010',
      price: 45.00,
      cost: 20.00,
      quantity: 120,
      image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800',
      category: 'Products',
      brand: 'AromaTherapy',
      status: 'active' as const,
      weight: 0.15,
      dimensions: '8x8x12',
    },
    {
      name: 'Meditation Cushion Set',
      description: 'Comfortable meditation cushion and mat set made from organic materials. Helps maintain proper posture during meditation practice.',
      sku: 'PROD-MED-011',
      price: 125.00,
      cost: 55.00,
      quantity: 35,
      image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
      category: 'Products',
      brand: 'MindfulLiving',
      status: 'active' as const,
      weight: 2.5,
      dimensions: '50x50x15',
    },
    {
      name: 'Stress Relief Tea Collection',
      description: 'Curated collection of herbal teas designed to help reduce stress and promote relaxation. Includes chamomile, passionflower, and lemon balm.',
      sku: 'PROD-TEA-012',
      price: 35.90,
      cost: 18.00,
      quantity: 90,
      image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800',
      category: 'Products',
      brand: 'TeaWell',
      status: 'active' as const,
      weight: 0.3,
      dimensions: '20x10x15',
    },
  ];

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const product of products) {
    try {
      const result = await prisma.product.upsert({
        where: { sku: product.sku },
        update: {
          name: product.name,
          description: product.description,
          price: product.price,
          cost: product.cost,
          quantity: product.quantity,
          image: product.image,
          category: product.category,
          brand: product.brand,
          status: product.status,
          weight: product.weight,
          dimensions: product.dimensions,
        },
        create: product,
      });
      
      if (result) {
        // Check if it was created or updated by trying to find it
        const existing = await prisma.product.findUnique({ where: { sku: product.sku } });
        if (existing?.createdAt.getTime() === existing?.updatedAt.getTime()) {
          created++;
          console.log(`✅ Criado: ${product.name}`);
        } else {
          updated++;
          console.log(`🔄 Atualizado: ${product.name}`);
        }
      }
    } catch (error: any) {
      errors++;
      console.error(`❌ Erro ao criar produto ${product.name}:`, error.message);
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
    console.error('❌ Erro durante o seed de produtos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
