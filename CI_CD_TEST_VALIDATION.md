# 🔍 Validação de Limpeza de Testes na CI/CD

## 📋 Visão Geral

Sistema automático para garantir que os testes não deixem dados "vazando" no banco de dados.

### Como Funciona?

1. **Antes dos testes:** Conta quantos registros de teste existem no banco
2. **Durante:** Executa todos os testes
3. **Depois dos testes:** Conta novamente os registros
4. **Validação:** Se houver mais registros depois = FALHA ❌

## 🛠️ Ferramentas Criadas

### 1. `scripts/count-test-data.ts`

**Função:** Conta registros de teste em todas as tabelas

**Uso:**
```bash
npm run test:count-data
```

**Output:**
```json
{
  "persons": 0,
  "personContacts": 0,
  "users": 0,
  "products": 0,
  "orders": 0,
  "orderItems": 0,
  "activities": 0,
  "ads": 0,
  "advertisers": 0,
  "anamnesisAnswers": 0,
  "anamnesisQuestions": 0
}

✅ Nenhum registro de teste encontrado.
```

**Exit Codes:**
- `0`: Nenhum registro de teste (✅ sucesso)
- `1`: Encontrou registros de teste (❌ falha)

---

### 2. `scripts/validate-test-cleanup.sh`

**Função:** Valida limpeza antes/depois dos testes

**Uso:**
```bash
npm run test:validate-cleanup
```

**Fluxo:**
```
1️⃣  Conta dados ANTES
     ↓
2️⃣  Roda todos os testes
     ↓
3️⃣  Conta dados DEPOIS
     ↓
4️⃣  Compara resultados
     ↓
   ✅ Sucesso ou ❌ Falha
```

**Exemplo de Output:**
```
🔍 Validação de Limpeza de Dados de Teste
==========================================

1️⃣  Contando dados de teste ANTES dos testes...
{
  "persons": 0,
  "users": 0,
  ...
}

2️⃣  Rodando os testes...
----------------------------------------
Tests:       296 passed, 4 failed, 300 total
----------------------------------------

3️⃣  Contando dados de teste DEPOIS dos testes...
{
  "persons": 0,
  "users": 0,
  ...
}

4️⃣  Comparando resultados...

📊 Resumo:
  Antes dos testes: 0 registros
  Depois dos testes: 0 registros

✅ SUCESSO: Nenhum dado de teste acumulado.

🎉 Validação concluída com sucesso!
```

---

## 🚀 Integração na CI/CD

### GitHub Actions

Workflow criado: `.github/workflows/test-with-validation.yml`

**Triggers:**
- Push para `staging` ou `main`
- Pull requests para `staging` ou `main`

**Steps:**
1. Setup (Node.js, PostgreSQL)
2. Install dependencies
3. Migrate database
4. **Count BEFORE** ⬅️
5. Run tests
6. **Count AFTER** ⬅️
7. **Validate cleanup** ⬅️
8. Report results

**Exemplo de execução:**
```
✓ Setup Node.js
✓ Install dependencies
✓ Setup database
✓ Count test data BEFORE tests
  📊 Registros antes: 0
✓ Run tests
  296 passed, 4 failed
✓ Count test data AFTER tests
  📊 Registros depois: 0
✓ Validate cleanup
  ✅ SUCESSO: Limpeza funcionando corretamente!
```

---

## 📊 O Que É Validado?

### Tabelas Monitoradas:

| Tabela | Padrão de Detecção |
|--------|-------------------|
| **persons** | ID contém `-system-test` |
| **personContacts** | ID contém `-system-test` |
| **users** | ID ou username com `@example.com` |
| **products** | ID ou nome com "Test" |
| **orders** | ID contém `-system-test` |
| **orderItems** | ID contém `-system-test` |
| **activities** | ID ou nome com "Test" |
| **ads** | ID contém `-system-test` |
| **advertisers** | ID contém `-system-test` |
| **anamnesisAnswers** | ID contém `-system-test` |
| **anamnesisQuestions** | Key contém `-system-test` |

---

## 🎯 Cenários de Validação

### ✅ Cenário 1: Limpeza Perfeita
```
Antes: 0 registros
Depois: 0 registros
Resultado: ✅ SUCESSO
```

### ✅ Cenário 2: Limpeza de Dados Antigos
```
Antes: 10 registros (dados antigos)
Depois: 0 registros
Resultado: ✅ SUCESSO (10 registros limpos!)
```

### ❌ Cenário 3: Vazamento de Dados
```
Antes: 0 registros
Depois: 5 registros
Resultado: ❌ FALHA (5 registros vazaram!)
```

**Ação:** Investigar quais testes não estão limpando corretamente.

---

## 🔧 Uso Local

### Validar Limpeza Completa:
```bash
npm run test:validate-cleanup
```

### Apenas Contar Dados:
```bash
npm run test:count-data
```

### Limpar Dados de Teste Manualmente:
```bash
npm run db:cleanup-tests
```

---

## 🐛 Troubleshooting

### Problema: "Registros não foram limpos"

**Causa:** Algum teste não está usando `safeTestCleanup()` corretamente.

**Solução:**
1. Verificar se todos os IDs são criados com `generateTestId()`
2. Confirmar que `testDataTracker.add()` está sendo chamado
3. Verificar se `safeTestCleanup()` está no `afterAll()`

**Exemplo correto:**
```typescript
afterAll(async () => {
  await safeTestCleanup(testDataTracker, prisma);
  await prisma.$disconnect();
});

it('should create user', async () => {
  const userId = generateTestId(); // ✅ Tem sufixo -system-test
  const user = await prisma.user.create({
    data: { id: userId, ...data }
  });
  testDataTracker.add('user', user.id); // ✅ Rastreado
});
```

---

### Problema: "Contagem está errada"

**Causa:** Padrão de detecção não está pegando todos os dados.

**Solução:** Atualizar `scripts/count-test-data.ts` com novos padrões.

---

## 📈 Métricas e KPIs

### KPI Principal: Taxa de Vazamento

```
Taxa de Vazamento = (Registros Depois - Registros Antes) / Total de Testes
```

**Meta:** 0% (nenhum vazamento)

### Monitoramento:

```bash
# Ver histórico de vazamentos na CI
gh run list --workflow=test-with-validation.yml
```

---

## 🎓 Best Practices

### 1. **Sempre Use `generateTestId()`**
```typescript
const id = generateTestId(); // ✅
const id = uuid(); // ❌ Não tem sufixo
```

### 2. **Rastreie Tudo**
```typescript
testDataTracker.add('user', user.id);
testDataTracker.add('order', order.id);
```

### 3. **Use `safeTestCleanup()` no `afterAll`**
```typescript
afterAll(async () => {
  await safeTestCleanup(testDataTracker, prisma);
  await prisma.$disconnect();
});
```

### 4. **Não Crie Dados Fora de Testes**
- Não use scripts manuais para testes
- Use apenas testes automatizados

---

## 🚦 Status da Validação

**Última verificação:** 2026-01-15

| Métrica | Valor |
|---------|-------|
| Testes com vazamento | 0 |
| Taxa de vazamento | 0% |
| Registros no banco | 0 |
| Status | ✅ FUNCIONANDO |

---

## 📚 Referências

- `CLEANUP_TESTS_README.md` - Guia de limpeza manual
- `TESTES_RESUMO.md` - Estratégia de testes
- `VALIDATION_REPORT.md` - Relatório de validação
- `src/utils/test-helpers.ts` - Utilitários de teste

---

## 🤝 Contribuindo

Se você criar novos testes:

1. ✅ Use `generateTestId()` para IDs
2. ✅ Rastreie com `testDataTracker.add()`
3. ✅ Execute `npm run test:validate-cleanup` antes do commit
4. ✅ Verifique se o CI passa

---

## 📞 Suporte

**Problemas com validação?**

1. Execute localmente: `npm run test:validate-cleanup`
2. Verifique os logs do CI
3. Consulte `VALIDATION_REPORT.md`
4. Revise `src/utils/test-helpers.ts`
