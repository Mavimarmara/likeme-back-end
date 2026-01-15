## Supabase para Produção (separado do Staging)

Objetivo: **manter o Supabase atual para staging** e **usar um novo Supabase exclusivo para produção**.

### 1) Criar o projeto no Supabase

- Supabase → **New project**
- Escolha **uma região** (idealmente próxima dos usuários e da Vercel)
- Defina **Database password** forte

### 2) Pegar as URLs de conexão (Postgres)

No Supabase → **Settings → Database → Connection string**:

- **DATABASE_URL** (runtime): prefira **Transaction pooler** (porta 6543 / pgbouncer)
- **DIRECT_URL** (migrations): use **Direct connection** (porta 5432)

### 3) Configurar variáveis no Vercel

No Vercel → projeto `likeme-back-end` → **Settings → Environment Variables**:

- **Production**
  - `DATABASE_URL` = URL do **Supabase de produção** (pooler)
  - `DIRECT_URL` = URL do **Supabase de produção** (direct)
- **Preview** (staging)
  - manter apontando para o **Supabase atual**

### 4) Aplicar migrations em produção

Com `DATABASE_URL` e `DIRECT_URL` do **banco de produção**:

```bash
npx prisma migrate deploy
```

### 5) Seed de dados essenciais (quando aplicável)

Se for necessário popular tabelas base (ex.: perguntas de anamnese), rode o seed com o **banco de produção** configurado.

### 6) Checklist de segurança

- Nunca usar banco de produção em testes/CI
- Rotacionar senha se houver suspeita de vazamento
- Restringir acesso (não expor secrets em scripts/commits)

