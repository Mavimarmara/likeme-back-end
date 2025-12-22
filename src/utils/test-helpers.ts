/**
 * Helper para verificar se os testes estão usando um banco de dados de teste
 * Previne que testes deletem dados de desenvolvimento/produção
 */
export function isTestDatabase(): boolean {
  const dbUrl = process.env.DATABASE_URL || '';
  return (
    dbUrl.includes('likeme_test') ||
    dbUrl.includes('/test') ||
    dbUrl.includes('_test') ||
    dbUrl.includes('localhost:5432/likeme_test')
  );
}

/**
 * Classe para rastrear IDs criados durante os testes
 */
export class TestDataTracker {
  private ids: Map<string, string[]> = new Map();

  add(table: string, id: string) {
    if (!this.ids.has(table)) {
      this.ids.set(table, []);
    }
    this.ids.get(table)!.push(id);
  }

  addMany(table: string, ids: string[]) {
    if (!this.ids.has(table)) {
      this.ids.set(table, []);
    }
    this.ids.get(table)!.push(...ids);
  }

  getIds(table: string): string[] {
    return this.ids.get(table) || [];
  }

  clear() {
    this.ids.clear();
  }

  getAllIds(): Map<string, string[]> {
    return new Map(this.ids);
  }
}

/**
 * Helper para limpar dados de teste de forma segura
 * Deleta APENAS os IDs rastreados durante os testes (mesmo em banco de produção)
 */
export async function safeTestCleanup(
  tracker: TestDataTracker,
  prisma: any
): Promise<void> {
  try {
    const allIds = tracker.getAllIds();
    
    // Deletar em ordem reversa (respeitando foreign keys)
    // Ordem: ads -> orderItems -> orders -> products -> advertisers -> users -> persons -> personContacts -> tips
    
    // Deletar ads primeiro (referenciam products)
    if (allIds.has('ad') && allIds.get('ad')!.length > 0) {
      await prisma.ad.deleteMany({
        where: { id: { in: allIds.get('ad') } },
      });
    }
    
    // Deletar orderItems dos produtos rastreados (mesmo que não tenham sido rastreados individualmente)
    if (allIds.has('product') && allIds.get('product')!.length > 0) {
      await prisma.orderItem.deleteMany({
        where: { productId: { in: allIds.get('product') } },
      });
    }
    
    // Deletar orderItems rastreados individualmente
    if (allIds.has('orderItem') && allIds.get('orderItem')!.length > 0) {
      await prisma.orderItem.deleteMany({
        where: { id: { in: allIds.get('orderItem') } },
      });
    }
    
    // Deletar orders (após orderItems)
    if (allIds.has('order') && allIds.get('order')!.length > 0) {
      await prisma.order.deleteMany({
        where: { id: { in: allIds.get('order') } },
      });
    }
    
    // Deletar products (após ads e orderItems)
    if (allIds.has('product') && allIds.get('product')!.length > 0) {
      try {
        await prisma.product.deleteMany({
          where: { id: { in: allIds.get('product') } },
        });
      } catch (error: any) {
        // Se falhar por foreign key, tentar soft delete
        if (error.code === 'P2003') {
          await prisma.product.updateMany({
            where: { id: { in: allIds.get('product') } },
            data: { deletedAt: new Date() },
          });
        } else {
          throw error;
        }
      }
    }
    
    if (allIds.has('advertiser') && allIds.get('advertiser')!.length > 0) {
      await prisma.advertiser.deleteMany({
        where: { id: { in: allIds.get('advertiser') } },
      });
    }
    
    if (allIds.has('user') && allIds.get('user')!.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: allIds.get('user') } },
      });
    }
    
    if (allIds.has('person') && allIds.get('person')!.length > 0) {
      await prisma.person.deleteMany({
        where: { id: { in: allIds.get('person') } },
      });
    }
    
    if (allIds.has('personContact') && allIds.get('personContact')!.length > 0) {
      await prisma.personContact.deleteMany({
        where: { id: { in: allIds.get('personContact') } },
      });
    }
    
    if (allIds.has('tip') && allIds.get('tip')!.length > 0) {
      await prisma.tip.deleteMany({
        where: { id: { in: allIds.get('tip') } },
      });
    }
    
    if (allIds.has('activity') && allIds.get('activity')!.length > 0) {
      await prisma.activity.deleteMany({
        where: { id: { in: allIds.get('activity') } },
      });
    }
    
    tracker.clear();
  } catch (error) {
    console.error('Erro ao limpar dados de teste:', error);
  }
}
