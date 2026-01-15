# Estratégia de Banco de Dados: Projetos Separados vs Schemas vs Branches

## Contexto

Para um banco de dados **maduro** (produção real com dados sensíveis), você precisa de **isolamento completo** entre staging e production.

## Opções Disponíveis no Supabase

### ❌ Opção 1: Branches de Banco (NÃO disponível)

**Status**: Supabase **não oferece** feature branches nativas.

- ✅ Prós (se existisse):
  - Criação rápida de ambientes temporários
  - Cópia automática do schema
  - Merge de branches
  
- ❌ Contras:
  - Não disponível no Supabase
  - Plataformas que oferecem (NeonDB, PlanetScale) têm custos diferentes

**Veredito**: ❌ Não é uma opção viável no Supabase.

---

### ⚠️ Opção 2: Schemas Separados no Mesmo Projeto

**Como funciona**: Criar schemas separados dentro do mesmo banco PostgreSQL (ex: `public_staging`, `public_production`).

**Implementação**:
```sql
-- Criar schema staging
CREATE SCHEMA IF NOT EXISTS staging;
CREATE SCHEMA IF NOT EXISTS production;

-- Tabelas em staging
CREATE TABLE staging.users (...);

-- Tabelas em production  
CREATE TABLE production.users (...);
```

**Prós**:
- ✅ Um único projeto Supabase (custo único)
- ✅ Migrations podem ser versionadas por schema
- ✅ Backup unificado

**Contras**:
- ❌ **Isolamento limitado** (mesmo cluster, mesma infraestrutura)
- ❌ **Risco de acidente** (migration errada pode afetar ambos schemas)
- ❌ **Prisma não suporta nativamente** (precisa ajustar `schema.prisma` com `schema` parameter)
- ❌ **Difícil de gerenciar** (precisa definir qual schema usar em cada ambiente)
- ❌ **Limites de recursos compartilhados** (CPU, RAM, conexões)

**Veredito**: ⚠️ Funciona, mas **não recomendado** para produção real.

---

### ✅ Opção 3: Projetos Separados (RECOMENDADO)

**Como funciona**: Dois projetos Supabase completamente independentes.

**Estrutura**:
```
Supabase Organization
├── likeme-staging (projeto)
│   └── Database PostgreSQL (isolado)
└── likeme-production (projeto)
    └── Database PostgreSQL (isolado)
```

**Prós**:
- ✅ **Isolamento total** (infraestrutura separada)
- ✅ **Zero risco de cross-contamination** (nada em staging afeta produção)
- ✅ **Limites independentes** (queries pesadas em staging não afetam prod)
- ✅ **Backups independentes** (configurações diferentes)
- ✅ **Prisma funciona nativamente** (sem ajustes no schema)
- ✅ **Conformidade/GDPR** (se staging tem dados de teste, prod fica limpo)
- ✅ **Rollback independente** (se staging quebrar, prod continua rodando)
- ✅ **Custos claros** (pode ter planos diferentes por ambiente)

**Contras**:
- ❌ **Dois projetos = dois custos** (se estiver no plano pago)
- ⚠️ **Migrations precisam ser aplicadas em ambos** (mas isso é bom - força testes!)

**Veredito**: ✅ **RECOMENDADO** para banco maduro.

---

## Recomendação Final

### 🏆 **Para banco maduro: Projetos Separados**

**Motivos**:
1. **Isolamento total** = zero risco de quebrar produção durante testes
2. **Conformidade** = staging pode ter dados anonimizados/de teste; prod mantém dados reais separados
3. **Prisma/ferramentas** funcionam nativamente sem hacks
4. **Operacional** = backups, monitoramento e limites independentes

### Workflow Recomendado

```
┌─────────────────┐
│  Development    │  →  Branch local, DB local (docker)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Staging      │  →  Projeto Supabase separado
│ (Testes E2E)    │     Branch: staging → Vercel Preview
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Production     │  →  Projeto Supabase separado  
│  (Usuários reais)│    Branch: main → Vercel Production
└─────────────────┘
```

### Como Gerenciar Migrations

**1. Desenvolvimento** (local):
```bash
npx prisma migrate dev  # Cria migration
```

**2. Staging** (após merge em `staging`):
```bash
# Automático via Vercel (build) ou manual:
DATABASE_URL=$STAGING_DB_URL npx prisma migrate deploy
```

**3. Production** (após merge em `main`):
```bash
# Manual (controlado):
DATABASE_URL=$PROD_DB_URL npx prisma migrate deploy
```

**Vantagem**: Força você a **testar migrations em staging antes de produção**.

---

## Comparação Rápida

| Critério | Projetos Separados | Schemas Separados | Branches |
|----------|-------------------|-------------------|----------|
| **Isolamento** | ✅ Total | ⚠️ Parcial | ❌ N/A |
| **Segurança** | ✅ Alta | ⚠️ Média | ❌ N/A |
| **Prisma Nativo** | ✅ Sim | ❌ Precisa ajuste | ❌ N/A |
| **Custo** | ⚠️ 2x projetos | ✅ 1x projeto | ❌ N/A |
| **Complexidade** | ✅ Baixa | ❌ Alta | ❌ N/A |
| **Disponível Supabase** | ✅ Sim | ✅ Sim (manual) | ❌ Não |

---

## Conclusão

**Para um banco maduro**: Use **projetos separados**.

- **Staging**: Projeto `likeme-staging` no Supabase
- **Production**: Projeto `likeme-production` no Supabase
- **Variáveis no Vercel**: Separadas por ambiente (Production vs Preview)

Isso garante **isolamento, segurança e operabilidade** que você precisa para um ambiente de produção real.

