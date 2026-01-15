# 🧹 Limpeza de Dados de Teste

Este documento explica como gerenciar dados de teste no banco de dados.

## Quando Rodar a Limpeza?

Execute a limpeza quando:
- O banco de staging/desenvolvimento está com muitos dados de teste
- Após rodar scripts manuais de teste (bash scripts)
- Periodicamente (recomendado: semanalmente)

## Como Limpar?

```bash
npm run db:cleanup-tests
```

## O Que É Limpo?

O script remove automaticamente:

### 1. **Usuários de Teste**
Padrões identificados:
- `@example.com` (ex: `test-123@example.com`)
- `test_*` (ex: `test_1234567890`)
- `testuser_*` (ex: `testuser_1234567890`)
- `*_test_*` (ex: `user_test_123`)
- `*_recipient_*` (ex: `test_recipient_123`)
- `*_split_*` (ex: `test_split_123`)

### 2. **Produtos de Teste**
- Qualquer produto com "test", "Test", ou "TEST" no nome
- Produtos criados por scripts de teste

### 3. **Atividades de Teste**
- Atividades com "Test" no nome

### 4. **Perguntas de Anamnese de Teste**
- Apenas perguntas com sufixo `-system-test` no `key`

### 5. **Dados Relacionados**
- Pedidos (orders) relacionados aos usuários/produtos de teste
- Contatos (person_contact) relacionados
- Respostas de anamnese relacionadas

## Testes Automatizados vs Scripts Manuais

### ✅ Testes Automatizados (`npm test`)
- **Limpeza:** Automática via `safeTestCleanup()`
- **Padrão:** Todos os IDs têm sufixo `-system-test`
- **Ação necessária:** Nenhuma

### ⚠️ Scripts Manuais (bash scripts)
- **Limpeza:** Manual via `npm run db:cleanup-tests`
- **Padrão:** Usam `@example.com` ou `test_*`
- **Ação necessária:** Rodar limpeza periodicamente

Scripts que criam dados manualmente:
- `scripts/add-test-ads.ts`
- `scripts/create-test-order.sh`
- `scripts/test-pagarme-success-direct.sh`
- `scripts/test-split-payment-prod.sh`
- `scripts/test-create-recipient.sh`

## Verificar Dados de Teste

Para ver quantos dados de teste existem:

```bash
cd scripts
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const testUsers = await prisma.user.count({
    where: {
      OR: [
        { username: { contains: '@example.com' } },
        { username: { startsWith: 'test_' } },
        { username: { startsWith: 'testuser_' } }
      ]
    }
  });
  console.log('Usuários de teste:', testUsers);
  await prisma.\$disconnect();
})();
"
```

## Automação (Recomendado)

### Cron Job no Servidor de Staging

```bash
# Executar toda segunda-feira às 2h da manhã
0 2 * * 1 cd /path/to/likeme-back-end && npm run db:cleanup-tests
```

### GitHub Actions (CI/CD)

Adicionar no `.github/workflows/cleanup-staging.yml`:

```yaml
name: Cleanup Staging Test Data

on:
  schedule:
    - cron: '0 2 * * 1' # Segunda-feira às 2h UTC
  workflow_dispatch: # Permite execução manual

jobs:
  cleanup:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run db:cleanup-tests
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
```

## Segurança

⚠️ **NUNCA** execute em produção sem revisar os dados que serão deletados!

O script tem proteção: só deleta dados que correspondem aos padrões de teste.

## Histórico de Limpezas

- **2026-01-15:** Removidos 262 usuários de teste (215 + 47)
  - Primeira limpeza massiva após atualização dos padrões
