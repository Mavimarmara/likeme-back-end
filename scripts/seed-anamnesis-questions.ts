import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Helper para gerar IDs
const generateId = () => randomUUID();

// Opções de resposta padrão para perguntas de sintomas (BODY)
const bodyAnswerOptions = [
  { key: 'grave', order: 0, text: 'Graves sintomas' },
  { key: 'moderado', order: 1, text: 'Moderados sintomas' },
  { key: 'leve', order: 2, text: 'Leves sintomas' },
  { key: 'sem', order: 3, text: 'Sem sintomas' },
  { key: 'plena_saude', order: 4, text: 'Plena saúde' },
];

// Opções de resposta para perguntas de hábitos (escala de tempo)
const habitTimeOptions = [
  { key: 'menos_15min', order: 0, text: 'Menos de 15 min. por semana' },
  { key: '15_30min', order: 1, text: 'De 15 a 30 min. por semana' },
  { key: '31_60min', order: 2, text: 'De 31 a 60 min. por semana' },
  { key: '1_2horas', order: 3, text: 'De 1 a 2 horas por semana' },
  { key: '2_5horas', order: 4, text: 'De 2 a 5 horas por semana' },
  { key: 'mais_5horas', order: 5, text: 'Mais de 5 horas por semana' },
];

async function seedAnamnesisQuestions() {
  try {
    console.log('🌱 Iniciando seed de perguntas da anamnese...\n');

    // ============================================
    // PERGUNTAS DE BODY (CORPO)
    // ============================================
    console.log('📋 Cadastrando perguntas de BODY (Corpo)...');
    
    const bodyQuestions = [
      {
        key: 'body_musculoesqueletico',
        text: 'Sistema musculoesquelético\nDores, rigidez ou limitações de movimento no corpo (músculos, articulações ou coluna).',
      },
      {
        key: 'body_cardiovascular',
        text: 'Sistema cardiovascular\nSensação de cansaço exacerbado ao fazer esforço, palpitação, dor no peito, pressão alta ou baixa.',
      },
      {
        key: 'body_respiratorio',
        text: 'Sistema respiratório\nFôlego curto, tosse frequente, chiado no peito ou dificuldade para respirar.',
      },
      {
        key: 'body_digestivo',
        text: 'Sistema digestivo\nRefluxo, gases, constipação, diarreia, dores abdominais ou má digestão.',
      },
      {
        key: 'body_imunologico',
        text: 'Sistema imunológico\nFrequência de gripes, resfriados, infecções ou alergias. Imunidade de uma forma geral.',
      },
      {
        key: 'body_urinario',
        text: 'Sistema urinário\nFrequência urinária, dor ao urinar, infecções urinárias, controle da bexiga.',
      },
      {
        key: 'body_reprodutor_sexual',
        text: 'Sistema reprodutor/sexual\nDesejo sexual, função sexual, saúde menstrual ou prostática.',
      },
      {
        key: 'body_neurocognitivo',
        text: 'Funções Neurocognitivas\nNível de energia, memória, atenção, concentração, coordenação motora.',
      },
      {
        key: 'body_pele_unhas_cabelo',
        text: 'Pele, unhas e cabelo\nErupções, queda de cabelo, oleosidade, coceiras, ressecamento e unhas fracas ou quebradiças.',
      },
      {
        key: 'body_percepcao',
        text: 'Percepção: visão e audição\nQualidade da visão, qualidade da audição, zumbido.',
      },
    ];

    for (const question of bodyQuestions) {
      await prisma.anamnesisQuestionConcept.upsert({
        where: { key: question.key },
        update: {},
        create: {
          id: generateId(),
          key: question.key,
          type: 'single_choice',
          texts: {
            create: {
              id: generateId(),
              locale: 'pt-BR',
              value: question.text,
            },
          },
          answerOptions: {
            create: bodyAnswerOptions.map((opt) => ({
              id: generateId(),
              key: opt.key,
              order: opt.order,
              texts: {
                create: {
                  id: generateId(),
                  locale: 'pt-BR',
                  value: opt.text,
                },
              },
            })),
          },
        },
      });
      console.log(`   ✅ ${question.key}`);
    }

    // ============================================
    // PERGUNTAS DE MIND (MENTE)
    // ============================================
    console.log('\n🧠 Cadastrando perguntas de MIND (Mente)...');
    
    // Para perguntas de mind, precisamos de uma escala numérica de 0 a 10
    // Mas o schema suporta 'number' como tipo. No entanto, vendo o Figma,
    // parece que são perguntas com escala, então vamos usar single_choice
    // com opções de 0 a 10. Mas na verdade, o design mostra uma escala
    // contínua, então pode ser que precise ser 'number'. Vou usar 'number'
    // por enquanto, já que não há opções pré-definidas.
    
    const mindQuestions = [
      {
        key: 'mind_vergonha_humilhacao',
        text: 'Sentimentos de vergonha, humilhação, não merecimento ou um senso de identidade fragilizada e vazio.',
      },
      {
        key: 'mind_culpa_autocritica',
        text: 'Sentimentos de culpa, autopunição, autocrítica intensa ou uma visão negativa de si.',
      },
      {
        key: 'mind_tristeza_apatia',
        text: 'Tristeza persistente, apatia, falta de vontade, não se sentir suficiente, mágoa ou desamparo.',
      },
      {
        key: 'mind_medo_ansiedade',
        text: 'Medo recorrente, ansiedade, hipervigilância, sensação de ameaça.',
      },
      {
        key: 'mind_desejos_carencia',
        text: 'Desejos intensos, carência, insatisfação crônica, dependências.',
      },
      {
        key: 'mind_raiva_frustracao',
        text: 'Raiva, frustração, irritação, reatividade ou sensação de estar sempre na defensiva.',
      },
      {
        key: 'mind_autoconfianca_otimismo',
        text: 'Autoconfiança, otimismo, empoderamento, coragem para agir e enfrentar desafios.',
      },
      {
        key: 'mind_equilibrio_emocional',
        text: 'Equilíbrio emocional, clareza mental e sensação de conseguir dar conta do cotidiano.',
      },
      {
        key: 'mind_paz_aceitacao',
        text: 'Sensação de estar em paz consigo, com mais aceitação e menos conflito interno, sabedoria.',
      },
      {
        key: 'mind_alegria_gratidao',
        text: 'Alegria, gratidão à vida e a sensação de estar completo(a) e conectado(a).',
      },
    ];

    // Para perguntas de mind, vamos usar tipo 'number' já que é uma escala de 0 a 10
    for (const question of mindQuestions) {
      await prisma.anamnesisQuestionConcept.upsert({
        where: { key: question.key },
        update: {},
        create: {
          id: generateId(),
          key: question.key,
          type: 'number',
          texts: {
            create: {
              id: generateId(),
              locale: 'pt-BR',
              value: question.text,
            },
          },
        },
      });
      console.log(`   ✅ ${question.key}`);
    }

    // ============================================
    // PERGUNTAS DE HÁBITOS
    // ============================================
    console.log('\n🏃 Cadastrando perguntas de HÁBITOS...');
    
    // Do design do Figma, vi apenas "Movimento" mas há mais perguntas de hábitos
    // Vou criar a pergunta de Movimento primeiro
    const habitQuestions = [
      {
        key: 'habits_movimento',
        text: 'Movimento\nExercícios que ajudam a alongar, fortalecer e equilibrar o corpo como Yoga, Pilates, Tai Chi ou alongamento.',
        answerOptions: habitTimeOptions,
      },
      // Adicionar mais perguntas de hábitos conforme necessário
    ];

    for (const question of habitQuestions) {
      await prisma.anamnesisQuestionConcept.upsert({
        where: { key: question.key },
        update: {},
        create: {
          id: generateId(),
          key: question.key,
          type: 'single_choice',
          texts: {
            create: {
              id: generateId(),
              locale: 'pt-BR',
              value: question.text,
            },
          },
          answerOptions: {
            create: question.answerOptions.map((opt) => ({
              id: generateId(),
              key: opt.key,
              order: opt.order,
              texts: {
                create: {
                  id: generateId(),
                  locale: 'pt-BR',
                  value: opt.text,
                },
              },
            })),
          },
        },
      });
      console.log(`   ✅ ${question.key}`);
    }

    console.log('\n✅ Seed de perguntas da anamnese concluído!');
  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedAnamnesisQuestions()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

