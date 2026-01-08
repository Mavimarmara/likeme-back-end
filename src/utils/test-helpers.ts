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
 * Prefixo padrão para IDs de teste
 */
export const TEST_ID_PREFIX = '-system-test';

/**
 * Verifica se um ID é um ID de teste
 */
export function isTestId(id: string): boolean {
  return id.includes(TEST_ID_PREFIX);
}

/**
 * Gera um ID de teste com o sufixo -system-test
 */
export function generateTestId(): string {
  const { randomUUID } = require('crypto');
  return `${randomUUID()}${TEST_ID_PREFIX}`;
}

/**
 * Helper para criar um token de teste com IDs seguros
 */
export async function createTestToken(prisma: any, tracker: TestDataTracker): Promise<string> {
  const personId = generateTestId();
  const person = await prisma.person.create({
    data: {
      id: personId,
      firstName: 'Test',
      lastName: 'User',
    },
  });
  tracker.add('person', person.id);

  const userId = generateTestId();
  const user = await prisma.user.create({
    data: {
      id: userId,
      personId: person.id,
      username: `test${Date.now()}${TEST_ID_PREFIX}@example.com`,
      password: 'hashedpassword',
      isActive: true,
    },
  });
  tracker.add('user', user.id);

  const jwt = require('jsonwebtoken');
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
}

/**
 * Classe para rastrear IDs criados durante os testes
 */
export class TestDataTracker {
  private ids: Map<string, string[]> = new Map();

  add(table: string, id: string) {
    // Apenas rastrear IDs que são de teste
    if (!isTestId(id)) {
      console.warn(`⚠️  Tentativa de rastrear ID não-test: ${id} na tabela ${table}`);
      return;
    }
    if (!this.ids.has(table)) {
      this.ids.set(table, []);
    }
    this.ids.get(table)!.push(id);
  }

  addMany(table: string, ids: string[]) {
    // Filtrar apenas IDs de teste
    const testIds = ids.filter(isTestId);
    if (testIds.length < ids.length) {
      console.warn(`⚠️  Alguns IDs não são de teste e foram ignorados na tabela ${table}`);
    }
    if (testIds.length === 0) return;
    
    if (!this.ids.has(table)) {
      this.ids.set(table, []);
    }
    this.ids.get(table)!.push(...testIds);
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
 * Deleta APENAS os IDs rastreados durante os testes que contenham o prefixo de teste
 * @param tracker - Tracker com IDs rastreados
 * @param prisma - Instância do Prisma Client
 * @param testIdPrefix - Prefixo para identificar IDs de teste (padrão: '-system-test')
 */
export async function safeTestCleanup(
  tracker: TestDataTracker,
  prisma: any,
  testIdPrefix: string = TEST_ID_PREFIX
): Promise<void> {
  try {
    const allIds = tracker.getAllIds();
    
    // Log para debug (apenas em ambiente de teste)
    if (process.env.NODE_ENV === 'test') {
      const totalIds = Array.from(allIds.values()).reduce((sum, ids) => sum + ids.length, 0);
      console.log(`🧹 Limpando ${totalIds} IDs de teste...`);
    }
    
    // Filtrar apenas IDs que contêm o prefixo de teste (segurança extra)
    const filterTestIds = (ids: string[]): string[] => {
      return ids.filter(id => id.includes(testIdPrefix));
    };
    
    // Deletar em ordem reversa (respeitando foreign keys)
    // Ordem: ads -> orderItems -> orders -> products -> advertisers -> users -> persons -> personContacts -> tips
    
    // Deletar ads primeiro (referenciam products)
    if (allIds.has('ad') && allIds.get('ad')!.length > 0) {
      const testAdIds = filterTestIds(allIds.get('ad')!);
      if (testAdIds.length > 0) {
      await prisma.ad.deleteMany({
          where: { id: { in: testAdIds } },
      });
      }
    }
    
    // Deletar orderItems dos produtos rastreados (mesmo que não tenham sido rastreados individualmente)
    if (allIds.has('product') && allIds.get('product')!.length > 0) {
      const testProductIds = filterTestIds(allIds.get('product')!);
      if (testProductIds.length > 0) {
      await prisma.orderItem.deleteMany({
          where: { productId: { in: testProductIds } },
      });
      }
    }
    
    // Deletar orderItems rastreados individualmente
    if (allIds.has('orderItem') && allIds.get('orderItem')!.length > 0) {
      const testOrderItemIds = filterTestIds(allIds.get('orderItem')!);
      if (testOrderItemIds.length > 0) {
      await prisma.orderItem.deleteMany({
          where: { id: { in: testOrderItemIds } },
      });
      }
    }
    
    // Deletar orders (após orderItems)
    if (allIds.has('order') && allIds.get('order')!.length > 0) {
      const testOrderIds = filterTestIds(allIds.get('order')!);
      if (testOrderIds.length > 0) {
      await prisma.order.deleteMany({
          where: { id: { in: testOrderIds } },
      });
      }
    }
    
    // Deletar products (após ads e orderItems)
    if (allIds.has('product') && allIds.get('product')!.length > 0) {
      const testProductIds = filterTestIds(allIds.get('product')!);
      if (testProductIds.length > 0) {
      try {
        await prisma.product.deleteMany({
            where: { id: { in: testProductIds } },
        });
      } catch (error: any) {
        // Se falhar por foreign key, tentar soft delete
        if (error.code === 'P2003') {
          await prisma.product.updateMany({
              where: { id: { in: testProductIds } },
            data: { deletedAt: new Date() },
          });
        } else {
          throw error;
          }
        }
      }
    }
    
    if (allIds.has('advertiser') && allIds.get('advertiser')!.length > 0) {
      const testAdvertiserIds = filterTestIds(allIds.get('advertiser')!);
      if (testAdvertiserIds.length > 0) {
      await prisma.advertiser.deleteMany({
          where: { id: { in: testAdvertiserIds } },
      });
      }
    }
    
    if (allIds.has('user') && allIds.get('user')!.length > 0) {
      const testUserIds = filterTestIds(allIds.get('user')!);
      if (testUserIds.length > 0) {
      await prisma.user.deleteMany({
          where: { id: { in: testUserIds } },
      });
      }
    }
    
    if (allIds.has('person') && allIds.get('person')!.length > 0) {
      const testPersonIds = filterTestIds(allIds.get('person')!);
      if (testPersonIds.length > 0) {
      await prisma.person.deleteMany({
          where: { id: { in: testPersonIds } },
      });
      }
    }
    
    if (allIds.has('personContact') && allIds.get('personContact')!.length > 0) {
      const testPersonContactIds = filterTestIds(allIds.get('personContact')!);
      if (testPersonContactIds.length > 0) {
      await prisma.personContact.deleteMany({
          where: { id: { in: testPersonContactIds } },
      });
      }
    }
    
    if (allIds.has('tip') && allIds.get('tip')!.length > 0) {
      const testTipIds = filterTestIds(allIds.get('tip')!);
      if (testTipIds.length > 0) {
      await prisma.tip.deleteMany({
          where: { id: { in: testTipIds } },
      });
      }
    }
    
    if (allIds.has('activity') && allIds.get('activity')!.length > 0) {
      const testActivityIds = filterTestIds(allIds.get('activity')!);
      if (testActivityIds.length > 0) {
      await prisma.activity.deleteMany({
          where: { id: { in: testActivityIds } },
        });
      }
    }
    
    // Deletar respostas de anamnese (anamneseUserAnswer)
    if (allIds.has('anamneseUserAnswer') && allIds.get('anamneseUserAnswer')!.length > 0) {
      const testAnswerIds = filterTestIds(allIds.get('anamneseUserAnswer')!);
      if (testAnswerIds.length > 0) {
        await prisma.anamneseUserAnswer.deleteMany({
          where: { id: { in: testAnswerIds } },
        });
      }
    }
    
    // Deletar textos de opções de resposta (anamneseAnswerOptionText)
    if (allIds.has('anamneseAnswerOptionText') && allIds.get('anamneseAnswerOptionText')!.length > 0) {
      const testOptionTextIds = filterTestIds(allIds.get('anamneseAnswerOptionText')!);
      if (testOptionTextIds.length > 0) {
        await prisma.anamneseAnswerOptionText.deleteMany({
          where: { id: { in: testOptionTextIds } },
      });
      }
    }
    
    // Deletar opções de resposta (anamneseAnswerOption)
    if (allIds.has('anamneseAnswerOption') && allIds.get('anamneseAnswerOption')!.length > 0) {
      const testOptionIds = filterTestIds(allIds.get('anamneseAnswerOption')!);
      if (testOptionIds.length > 0) {
        await prisma.anamneseAnswerOption.deleteMany({
          where: { id: { in: testOptionIds } },
        });
      }
    }
    
    // Deletar textos de perguntas (anamneseQuestionText)
    if (allIds.has('anamneseQuestionText') && allIds.get('anamneseQuestionText')!.length > 0) {
      const testQuestionTextIds = filterTestIds(allIds.get('anamneseQuestionText')!);
      if (testQuestionTextIds.length > 0) {
        await prisma.anamneseQuestionText.deleteMany({
          where: { id: { in: testQuestionTextIds } },
        });
      }
    }
    
    // Deletar conceitos de perguntas (anamneseQuestionConcept) - último, pois é referenciado por outros
    if (allIds.has('anamneseQuestionConcept') && allIds.get('anamneseQuestionConcept')!.length > 0) {
      const testQuestionConceptIds = filterTestIds(allIds.get('anamneseQuestionConcept')!);
      if (testQuestionConceptIds.length > 0) {
        await prisma.anamneseQuestionConcept.deleteMany({
          where: { id: { in: testQuestionConceptIds } },
        });
      }
    }
    
    // Deletar recipients da Pagarme (pagarmeRecipient)
    if (allIds.has('pagarmeRecipient') && allIds.get('pagarmeRecipient')!.length > 0) {
      const testRecipientIds = filterTestIds(allIds.get('pagarmeRecipient')!);
      if (testRecipientIds.length > 0) {
        await prisma.pagarmeRecipient.deleteMany({
          where: { id: { in: testRecipientIds } },
        });
      }
    }
    
    tracker.clear();
    
    if (process.env.NODE_ENV === 'test') {
      console.log('✅ Limpeza de dados de teste concluída');
    }
  } catch (error) {
    console.error('Erro ao limpar dados de teste:', error);
  }
}
