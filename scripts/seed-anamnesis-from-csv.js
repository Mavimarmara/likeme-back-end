const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Helper para gerar IDs
const generateId = () => randomUUID();

// Função para normalizar strings para uso como keys
function normalizeKey(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '_') // Substitui caracteres especiais por _
    .replace(/^_+|_+$/g, ''); // Remove _ do início e fim
}

// Função para parsear CSV simples (sem biblioteca externa)
function parseCSV(content) {
  const lines = content.split('\n');
  return lines.map(line => {
    const cols = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cols.push(current.trim());
    return cols;
  });
}

// Processar CSV de Física (termômetro 0-10)
async function processPhysicalCSV(csvPath) {
  console.log('\n🏥 Processando Anamnese Física...');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(content);
  
  const questions = [];
  
  let currentQuestion = null;
  let questionNumber = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const text = row[1]?.trim();
    
    if (!text) continue;
    
    // Detectar início de pergunta (começa com número.)
    const questionMatch = text.match(/^(\d+)\.\s*(.+)/);
    if (questionMatch) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      
      questionNumber = parseInt(questionMatch[1]);
      const questionText = questionMatch[2];
      
      // Pegar a descrição da próxima linha se existir
      let description = '';
      if (i + 1 < rows.length && rows[i + 1][1]) {
        const nextLine = rows[i + 1][1].trim();
        if (!nextLine.match(/^\d+\./) && !nextLine.match(/^(Graves|Moderados|Leves|Sem|Plena)/)) {
          description = nextLine;
        }
      }
      
      currentQuestion = {
        order: questionNumber,
        text: description ? `${questionText}\n${description}` : questionText,
        options: []
      };
    }
    
    // Detectar opções de resposta (linha com 0 ou 10 nos extremos)
    if (text === '0' || text === '10') {
      // Próximas linhas contêm as opções
      if (currentQuestion) {
        currentQuestion.options = [
          { key: 'graves_sintomas', value: 0, description: 'Graves sintomas', order: 0 },
          { key: 'moderados_sintomas', value: 2, description: 'Moderados sintomas', order: 1 },
          { key: 'leves_sintomas', value: 5, description: 'Leves sintomas', order: 2 },
          { key: 'sem_sintomas', value: 7, description: 'Sem sintomas', order: 3 },
          { key: 'plena_saude', value: 10, description: 'Plena saúde', order: 4 }
        ];
      }
    }
  }
  
  if (currentQuestion) {
    questions.push(currentQuestion);
  }
  
  // Inserir no banco
  for (const question of questions) {
    const key = `physical${normalizeKey(question.text.substring(0, 50))}`;
    
    try {
      await prisma.anamnesisQuestionConcept.upsert({
        where: { key },
        update: {},
        create: {
          id: generateId(),
          key,
          type: 'single_choice',
          order: question.order,
          texts: {
            create: {
              id: generateId(),
              locale: 'pt-BR',
              value: question.text,
            },
          },
          answerOptions: {
            create: question.options.map((opt) => ({
              id: generateId(),
              key: opt.key,
              value: String(opt.value),
              order: opt.order,
              texts: {
                create: {
                  id: generateId(),
                  locale: 'pt-BR',
                  value: opt.description,
                },
              },
            })),
          },
        },
      });
      console.log(`   ✅ ${question.order}. ${question.text.substring(0, 60)}...`);
    } catch (error) {
      console.error(`   ❌ Erro ao inserir pergunta ${question.order}: ${error.message}`);
    }
  }
}

// Processar CSV de Mental (escala 0-10)
async function processMentalCSV(csvPath) {
  console.log('\n🧠 Processando Anamnese Mental...');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(content);
  
  const questions = [];
  
  let currentQuestion = null;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const text = row[1]?.trim();
    
    if (!text) continue;
    
    // Detectar pergunta (começa com número.)
    const questionMatch = text.match(/^(\d+)\.\s*(.+)/);
    if (questionMatch) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      
      const questionNumber = parseInt(questionMatch[1]);
      const questionText = questionMatch[2];
      
      currentQuestion = {
        order: questionNumber,
        text: questionText,
        scaleMin: 0,
        scaleMax: 10,
        reverse: questionNumber <= 9 // Perguntas 1-9 são reversas
      };
    }
  }
  
  if (currentQuestion) {
    questions.push(currentQuestion);
  }
  
  // Inserir no banco
  for (const question of questions) {
    const key = `mental${normalizeKey(question.text.substring(0, 50))}`;
    
    // Criar opções de 0 a 10
    const options = [];
    for (let i = 0; i <= 10; i++) {
      const value = question.reverse ? (10 - i) : i;
      options.push({
        key: `score_${i}`,
        value: String(value),
        description: i.toString(),
        order: i
      });
    }
    
    try {
      await prisma.anamnesisQuestionConcept.upsert({
        where: { key },
        update: {},
        create: {
          id: generateId(),
          key,
          type: 'single_choice',
          order: question.order,
          texts: {
            create: {
              id: generateId(),
              locale: 'pt-BR',
              value: question.text,
            },
          },
          answerOptions: {
            create: options.map((opt) => ({
              id: generateId(),
              key: opt.key,
              value: opt.value,
              order: opt.order,
              texts: {
                create: {
                  id: generateId(),
                  locale: 'pt-BR',
                  value: opt.description,
                },
              },
            })),
          },
        },
      });
      console.log(`   ✅ ${question.order}. ${question.text.substring(0, 60)}...`);
    } catch (error) {
      console.error(`   ❌ Erro ao inserir pergunta ${question.order}: ${error.message}`);
    }
  }
}

// Processar CSVs de Markers (hábitos comportamentais)
async function processMarkerCSV(csvPath, category) {
  console.log(`\n📊 Processando ${category}...`);
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(content);
  
  const questions = [];
  
  let currentQuestion = null;
  let collectingOptions = false;
  const seenQuestions = new Set(); // Para evitar duplicatas
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const col1 = row[1]?.trim();
    const col2 = row[2]?.trim();
    
    if (!col1 && !col2) continue;
    
    // Detectar pergunta (começa com número.)
    const questionMatch = col1?.match(/^(\d+)\.\s*(.+)/);
    if (questionMatch) {
      // Salvar pergunta anterior se existir
      if (currentQuestion && currentQuestion.options.length > 0 && !seenQuestions.has(currentQuestion.text)) {
        questions.push(currentQuestion);
        seenQuestions.add(currentQuestion.text);
      }
      
      const questionNumber = parseInt(questionMatch[1]);
      const questionText = questionMatch[2];
      
      currentQuestion = {
        order: questionNumber,
        text: questionText,
        options: []
      };
      collectingOptions = false;
    }
    
    // Detectar início de opções
    if (col2 === 'Pontuação' || col2 === 'Ponto') {
      collectingOptions = true;
      continue;
    }
    
    // Coletar opções
    if (collectingOptions && col1 && col2 !== undefined && col2 !== '' && col2 !== 'Pontuação') {
      const description = col1;
      const valueStr = col2.replace(',', '.');
      const value = parseFloat(valueStr);
      
      if (currentQuestion && description && !isNaN(value)) {
        currentQuestion.options.push({
          key: normalizeKey(description),
          value: value,
          description: description,
          order: currentQuestion.options.length
        });
      }
    }
  }
  
  // Adicionar última pergunta
  if (currentQuestion && currentQuestion.options.length > 0 && !seenQuestions.has(currentQuestion.text)) {
    questions.push(currentQuestion);
  }
  
  // Inserir no banco
  for (const question of questions) {
    if (question.options.length === 0) continue;
    
    const categoryKey = normalizeKey(category);
    const key = `habits_${categoryKey}${normalizeKey(question.text.substring(0, 40))}`;
    
    try {
      await prisma.anamnesisQuestionConcept.upsert({
        where: { key },
        update: {},
        create: {
          id: generateId(),
          key,
          type: 'single_choice',
          order: question.order,
          texts: {
            create: {
              id: generateId(),
              locale: 'pt-BR',
              value: question.text,
            },
          },
          answerOptions: {
            create: question.options.map((opt) => ({
              id: generateId(),
              key: opt.key,
              value: String(opt.value),
              order: opt.order,
              texts: {
                create: {
                  id: generateId(),
                  locale: 'pt-BR',
                  value: opt.description,
                },
              },
            })),
          },
        },
      });
      console.log(`   ✅ ${question.order}. ${question.text.substring(0, 60)}...`);
    } catch (error) {
      console.error(`   ❌ Erro ao inserir pergunta ${question.order}: ${error.message}`);
    }
  }
}

async function main() {
  try {
    console.log('🌱 Iniciando importação de perguntas de anamnese dos CSVs...\n');
    
    const csvDir = '/Users/weber/Downloads';
    
    // Processar Física
    await processPhysicalCSV(path.join(csvDir, 'Perguntas Anamnese - Física.csv'));
    
    // Processar Mental
    await processMentalCSV(path.join(csvDir, 'Perguntas Anamnese - Mental.csv'));
    
    // Processar Markers
    await processMarkerCSV(path.join(csvDir, 'Perguntas Anamnese - Marker_ Autoestima.csv'), 'Autoestima');
    await processMarkerCSV(path.join(csvDir, 'Perguntas Anamnese - Marker_ Relacionamentos.csv'), 'Relacionamentos');
    await processMarkerCSV(path.join(csvDir, 'Perguntas Anamnese - Marker_ Estresse (1).csv'), 'Estresse');
    await processMarkerCSV(path.join(csvDir, 'Perguntas Anamnese - Marker_ Nutrição.csv'), 'Nutrição');
    await processMarkerCSV(path.join(csvDir, 'Perguntas Anamnese - Marker_ Movimento.csv'), 'Movimento');
    await processMarkerCSV(path.join(csvDir, 'Perguntas Anamnese - Marker_ Saúde Bucal.csv'), 'Saúde Bucal');
    await processMarkerCSV(path.join(csvDir, 'Perguntas Anamnese - Marker_ Propósito.csv'), 'Propósito');
    await processMarkerCSV(path.join(csvDir, 'Perguntas Anamnese - Marker_ Sono.csv'), 'Sono');
    await processMarkerCSV(path.join(csvDir, 'Perguntas Anamnese - Marker_ Espiritualidade.csv'), 'Espiritualidade');
    
    console.log('\n✅ Importação concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante a importação:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

