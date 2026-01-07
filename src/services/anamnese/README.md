# Sistema de Anamnese Clínica com i18n

## 📋 Estrutura do Banco de Dados

### Modelos Prisma

#### 1. `AnamneseQuestionConcept` (anamnese_question_concept)
Entidade semântica principal que representa uma pergunta.

```prisma
model AnamneseQuestionConcept {
  id        String    @id @default(uuid())
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
  
  key       String    @unique  // Identificador lógico único
  type      QuestionType  // single_choice | multiple_choice | text | number
  
  texts         AnamneseQuestionText[]
  answerOptions AnamneseAnswerOption[]
  userAnswers   AnamneseUserAnswer[]
}
```

#### 2. `AnamneseQuestionText` (anamnese_question_text)
Representação textual da pergunta por locale.

```prisma
model AnamneseQuestionText {
  id        String   @id @default(uuid())
  questionConceptId String
  locale    String   // "pt-BR", "en-US", etc
  value     String   // Texto exibido
  
  questionConcept AnamneseQuestionConcept @relation(...)
  
  @@unique([questionConceptId, locale])
}
```

#### 3. `AnamneseAnswerOption` (anamnese_answer_option)
Opções de resposta para perguntas de escolha.

```prisma
model AnamneseAnswerOption {
  id        String   @id @default(uuid())
  questionConceptId String
  key       String   // Identificador lógico (yes, no, grave, moderado, etc)
  order     Int      @default(0)
  
  questionConcept AnamneseQuestionConcept @relation(...)
  texts           AnamneseAnswerOptionText[]
  
  @@unique([questionConceptId, key])
}
```

#### 4. `AnamneseAnswerOptionText` (anamnese_answer_option_text)
Representação textual das opções por locale.

```prisma
model AnamneseAnswerOptionText {
  id        String   @id @default(uuid())
  answerOptionId String
  locale    String
  value     String   // Texto exibido
  
  answerOption AnamneseAnswerOption @relation(...)
  
  @@unique([answerOptionId, locale])
}
```

#### 5. `AnamneseUserAnswer` (user_answer)
Respostas dos usuários (histórico imutável).

```prisma
model AnamneseUserAnswer {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  userId            String
  questionConceptId String
  answerOptionId    String?  // Para perguntas de escolha
  answerText        String?  // Para perguntas abertas
  
  user            User            @relation(...)
  questionConcept QuestionConcept @relation(...)
  answerOption    AnswerOption?   @relation(...)
  
  @@unique([userId, questionConceptId])
}
```

## 🔄 Relacionamentos

```
AnamneseQuestionConcept (1) ──< (N) AnamneseQuestionText
AnamneseQuestionConcept (1) ──< (N) AnamneseAnswerOption
AnamneseAnswerOption (1) ──< (N) AnamneseAnswerOptionText
AnamneseQuestionConcept (1) ──< (N) AnamneseUserAnswer
User (1) ──< (N) AnamneseUserAnswer
AnamneseAnswerOption (1) ──< (N) AnamneseUserAnswer (opcional)
```

## 📝 Endpoints REST

### 1. Listar Anamnese Completa por Locale
```
GET /api/anamnese/complete?locale=pt-BR
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "key": "body_musculoskeletal_system",
      "type": "single_choice",
      "texts": [
        {
          "locale": "pt-BR",
          "value": "Sistema musculoesquelético"
        }
      ],
      "answerOptions": [
        {
          "id": "uuid",
          "key": "grave",
          "order": 0,
          "texts": [
            {
              "locale": "pt-BR",
              "value": "Graves sintomas"
            }
          ]
        }
      ]
    }
  ]
}
```

### 2. Criar Resposta do Usuário
```
POST /api/anamnese/answers
Content-Type: application/json

{
  "userId": "user-uuid",
  "questionConceptId": "question-uuid",
  "answerOptionId": "option-uuid",  // Para single_choice/multiple_choice
  "answerText": "texto resposta"     // Para text/number
}
```

### 3. Buscar Respostas do Usuário
```
GET /api/anamnese/answers/user/:userId?locale=pt-BR
```

## 🔍 Queries Prisma Principais

### Query Completa (Requisito Principal)
```typescript
const anamnese = await prisma.anamneseQuestionConcept.findMany({
  where: { deletedAt: null },
  include: {
    texts: {
      where: { locale: 'pt-BR' }
    },
    answerOptions: {
      include: {
        texts: {
          where: { locale: 'pt-BR' }
        }
      },
      orderBy: { order: 'asc' }
    }
  },
  orderBy: { createdAt: 'asc' }
});
```

### Criar Resposta
```typescript
const answer = await prisma.anamneseUserAnswer.upsert({
  where: {
    userId_questionConceptId: {
      userId: 'user-id',
      questionConceptId: 'question-id'
    }
  },
  update: {
    answerOptionId: 'option-id',
    answerText: null,
    updatedAt: new Date()
  },
  create: {
    userId: 'user-id',
    questionConceptId: 'question-id',
    answerOptionId: 'option-id',
    answerText: null
  }
});
```

## 📁 Estrutura de Arquivos

```
likeme-back-end/
├── prisma/
│   ├── schema.prisma              # Modelos definidos
│   └── migrations/
│       └── 20260107142158_add_anamnese_models/
│           └── migration.sql      # Migration SQL
├── src/
│   ├── controllers/
│   │   └── anamnese/
│   │       └── anamneseController.ts
│   ├── routes/
│   │   └── anamnese/
│   │       └── anamneseRoutes.ts
│   └── services/
│       └── anamnese/
│           ├── anamneseService.ts
│           └── anamneseQueries.examples.ts
```

## ✅ Características Implementadas

- ✅ Separação conceito/texto (obrigatório)
- ✅ Suporte a i18n (locale)
- ✅ Histórico clínico preservado (user_answer imutável)
- ✅ Nomenclatura exata conforme especificado
- ✅ Constraints e índices adequados
- ✅ Validação de tipos de pergunta
- ✅ Queries otimizadas com filtros por locale

## 🚀 Próximos Passos

1. Popular banco com perguntas iniciais
2. Implementar seed de dados
3. Adicionar testes unitários
4. Documentar API no Swagger

