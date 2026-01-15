## Supabase para Produção (separado do Staging)

Objetivo: **manter o Supabase atual para staging** e **usar um novo Supabase exclusivo para produção**.

### 1) Criar o projeto no Supabase (Manual - Dashboard)

**Passo a passo:**

1. Acesse: https://supabase.com/dashboard
2. Faça login com sua conta
3. Clique em **"New Project"** (ou **"New"** → **"Project"**)
4. Preencha:
   - **Name**: `likeme-production` (ou outro nome claro)
   - **Database Password**: **Gere uma senha forte** (salve em lugar seguro - você precisará dela!)
   - **Region**: Escolha a região mais próxima (ex: `South America (São Paulo)` se usuários são BR)
   - **Organization**: Selecione a organização adequada
5. Clique em **"Create new project"**
6. Aguarde a criação (pode levar 1-3 minutos)

**⚠️ IMPORTANTE**: Guarde a senha do banco! Você precisará dela para configurar as variáveis de ambiente.

### 2) Pegar as URLs de conexão (Postgres)

Após o projeto ser criado:

1. No dashboard do projeto → **Settings** (⚙️ no canto inferior esquerdo)
2. Vá em **Database**
3. Role até **Connection string**
4. Você verá 3 opções:

**Para DATABASE_URL (runtime/app):**
- Selecione **"Transaction pooler"** (ou "Connection pooling")
- Copie a URL (formato: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-...pooler.supabase.com:6543/postgres?pgbouncer=true`)

**Para DIRECT_URL (migrations):**
- Selecione **"Direct connection"** (ou "Session mode")
- Copie a URL (formato: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-...pooler.supabase.com:5432/postgres`)

**Ou use Connection pooling (URI):**
- Copie a URL do **"Connection string"** (URI)
- Substitua `[YOUR-PASSWORD]` pela senha que você criou

### 3) Configurar variáveis no Vercel

**Passo a passo:**

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto **`likeme-back-end`**
3. Vá em **Settings** → **Environment Variables**

**Para Production (novo banco):**
1. Clique em **"Add New"**
2. Key: `DATABASE_URL`
3. Value: Cole a URL do **Transaction pooler** (passo 2 acima)
4. Selecione apenas **"Production"** ☑️
5. Clique em **"Save"**

6. Repita para `DIRECT_URL`:
   - Key: `DIRECT_URL`
   - Value: Cole a URL do **Direct connection**
   - Selecione apenas **"Production"** ☑️
   - **"Save"**

**Para Preview/Staging (banco atual):**
- Não altere nada nas variáveis que já estão configuradas para **"Preview"** ou **"Development"**
- Elas continuarão apontando para o Supabase de staging

**Verificação:**
- `DATABASE_URL` → deve aparecer em **Production** (novo banco)
- `DIRECT_URL` → deve aparecer em **Production** (novo banco)
- Variáveis antigas → devem estar em **Preview** (staging)

### 4) Aplicar migrations em produção

**Opção A: Via Vercel (recomendado)**
- Após configurar as variáveis, faça um deploy em produção
- O Prisma aplicará as migrations automaticamente no primeiro deploy

**Opção B: Localmente (com variáveis temporárias)**

```bash
cd likeme-back-end

# Definir variáveis temporárias (substitua pelos valores do banco de produção)
export DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@..."
export DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@..."

# Aplicar migrations
npx prisma migrate deploy

# Verificar status
npx prisma migrate status
```

**Opção C: Via script helper**

```bash
# Criar .env.local com as URLs de produção (temporário)
cat > .env.local << EOF
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@..."
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@..."
EOF

# Rodar com o .env.local
export $(cat .env.local | xargs) && npx prisma migrate deploy

# Remover .env.local após uso (segurança)
rm .env.local
```

### 5) Seed de dados essenciais (quando aplicável)

Se for necessário popular tabelas base (ex.: perguntas de anamnese):

```bash
# Com DATABASE_URL/DIRECT_URL configuradas (produção)
npx ts-node scripts/seed-anamnesis-questions.ts
```

**⚠️ ATENÇÃO**: Só rode seed em produção após garantir que as migrations foram aplicadas corretamente!

### 6) Checklist de segurança

- Nunca usar banco de produção em testes/CI
- Rotacionar senha se houver suspeita de vazamento
- Restringir acesso (não expor secrets em scripts/commits)

