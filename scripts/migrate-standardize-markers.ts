import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script para padronizar as keys das perguntas de markers no banco de dados
 * 
 * Padroniza de nomes em português para nomes em inglês:
 * - habits_movimento -> habits_activity
 * - habits_relacionamentos -> habits_connection
 * - habits_ambiente -> habits_environment
 * - habits_nutricao -> habits_nutrition
 * - habits_proposito -> habits_purpose-vision
 * - habits_autoestima -> habits_self-esteem
 * - habits_sono -> habits_sleep
 * - habits_saude_bucal/sorriso -> habits_smile
 * - habits_espiritualidade -> habits_spirituality
 * - habits_estresse -> habits_stress
 */

// Mapeamento de nomes antigos (português) para novos (inglês padronizado)
const markerMapping: Record<string, string> = {
  movimento: 'activity',
  relacionamentos: 'connection',
  ambiente: 'environment',
  nutricao: 'nutrition',
  proposito: 'purpose-vision',
  autoestima: 'self-esteem',
  sono: 'sleep',
  'saude-bucal': 'smile',
  'saude_bucal': 'smile',
  sorriso: 'smile',
  espiritualidade: 'spirituality',
  estresse: 'stress',
};

// Prefixos comuns que precisam ser mapeados
const prefixMapping: Record<string, string> = {
  autoestimavoce: 'self-esteem',
  sonovoce: 'sleep',
  nutricao: 'nutrition',
};

function getStandardizedMarker(key: string): string | null {
  const lowerKey = key.toLowerCase();
  
  if (!lowerKey.startsWith('habits_')) {
    return null;
  }

  const afterHabits = lowerKey.substring(7); // Remove "habits_"
  
  // Tenta mapear pelos prefixos comuns primeiro (mais específicos)
  for (const [prefix, marker] of Object.entries(prefixMapping)) {
    if (afterHabits.startsWith(prefix)) {
      return marker;
    }
  }
  
  // Tenta mapear pelos nomes diretos
  for (const [oldName, newMarker] of Object.entries(markerMapping)) {
    if (afterHabits.startsWith(oldName)) {
      return newMarker;
    }
  }
  
  // Tenta pegar a primeira parte após habits_
  const parts = afterHabits.split('_');
  if (parts.length > 0) {
    const firstPart = parts[0];
    if (markerMapping[firstPart]) {
      return markerMapping[firstPart];
    }
  }
  
  return null;
}

function generateNewKey(oldKey: string, marker: string): string {
  // Remove o prefixo habits_
  const afterHabits = oldKey.substring(7); // Remove "habits_"
  
  // Encontra onde termina o nome antigo do marker
  let markerEndIndex = 0;
  
  // Tenta pelos prefixos primeiro (mais específicos)
  for (const [prefix] of Object.entries(prefixMapping)) {
    if (afterHabits.startsWith(prefix)) {
      markerEndIndex = prefix.length;
      break;
    }
  }
  
  // Se não encontrou, tenta pelos nomes diretos
  if (markerEndIndex === 0) {
    for (const [oldName] of Object.entries(markerMapping)) {
      if (afterHabits.startsWith(oldName)) {
        markerEndIndex = oldName.length;
        break;
      }
    }
  }
  
  // Se ainda não encontrou, pega a primeira parte até o primeiro _
  if (markerEndIndex === 0) {
    const firstUnderscore = afterHabits.indexOf('_');
    if (firstUnderscore > 0) {
      markerEndIndex = firstUnderscore;
    } else {
      // Se não tem underscore, a key inteira é o nome do marker
      markerEndIndex = afterHabits.length;
    }
  }
  
  // Pega o resto da key após o nome do marker
  const rest = afterHabits.substring(markerEndIndex);
  
  // Gera a nova key: habits_${marker}_${resto}
  // Se o resto começa com _, mantém; senão adiciona _
  const newKey = rest.startsWith('_') 
    ? `habits_${marker}${rest}`
    : rest.length > 0
      ? `habits_${marker}_${rest}`
      : `habits_${marker}`;
  
  return newKey;
}

async function migrateMarkers() {
  console.log('🔄 Iniciando migração de markers...\n');
  
  try {
    // Buscar todas as perguntas que começam com habits_
    const questions = await prisma.anamnesisQuestionConcept.findMany({
      where: {
        deletedAt: null,
        key: { startsWith: 'habits_' },
      },
      select: {
        id: true,
        key: true,
      },
    });

    console.log(`📊 Encontradas ${questions.length} perguntas de habits_\n`);

    const updates: Array<{ oldKey: string; newKey: string; marker: string }> = [];
    const skipped: string[] = [];

    // Processar cada pergunta
    for (const question of questions) {
      const marker = getStandardizedMarker(question.key);
      
      if (!marker) {
        skipped.push(question.key);
        console.log(`⚠️  Não foi possível mapear: ${question.key}`);
        continue;
      }

      const newKey = generateNewKey(question.key, marker);
      
      // Se a key já está padronizada, pular
      if (question.key === newKey) {
        continue;
      }

      updates.push({
        oldKey: question.key,
        newKey,
        marker,
      });
    }

    console.log(`\n📝 Resumo:`);
    console.log(`   - Perguntas encontradas: ${questions.length}`);
    console.log(`   - Perguntas para atualizar: ${updates.length}`);
    console.log(`   - Perguntas ignoradas: ${skipped.length}\n`);

    if (updates.length === 0) {
      console.log('✅ Nenhuma atualização necessária. Todas as keys já estão padronizadas!');
      return;
    }

    // Agrupar por marker para exibir estatísticas
    const byMarker: Record<string, number> = {};
    updates.forEach((update) => {
      byMarker[update.marker] = (byMarker[update.marker] || 0) + 1;
    });

    console.log('📊 Atualizações por marker:');
    Object.entries(byMarker).forEach(([marker, count]) => {
      console.log(`   - ${marker}: ${count} perguntas`);
    });

    console.log('\n🔄 Aplicando atualizações...\n');

    // Atualizar cada pergunta
    let successCount = 0;
    let errorCount = 0;

    for (const update of updates) {
      try {
        // Verificar se a nova key já existe
        const existing = await prisma.anamnesisQuestionConcept.findUnique({
          where: { key: update.newKey },
        });

        if (existing) {
          console.log(`⚠️  Key já existe, pulando: ${update.oldKey} -> ${update.newKey}`);
          errorCount++;
          continue;
        }

        // Buscar a pergunta atual para obter o ID
        const question = await prisma.anamnesisQuestionConcept.findUnique({
          where: { key: update.oldKey },
          select: { id: true },
        });

        if (!question) {
          console.log(`⚠️  Pergunta não encontrada: ${update.oldKey}`);
          errorCount++;
          continue;
        }

        // Atualizar a key
        await prisma.anamnesisQuestionConcept.update({
          where: { id: question.id },
          data: { key: update.newKey },
        });

        successCount++;
        console.log(`✅ ${update.oldKey} -> ${update.newKey}`);
      } catch (error: any) {
        console.error(`❌ Erro ao atualizar ${update.oldKey}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Resultado final:');
    console.log(`   ✅ Sucesso: ${successCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);
    console.log(`\n✅ Migração concluída!`);
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar migração
migrateMarkers()
  .then(() => {
    console.log('\n✅ Script executado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro ao executar script:', error);
    process.exit(1);
  });

