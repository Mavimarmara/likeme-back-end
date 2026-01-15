# Configuração de Ambiente Staging na Vercel

Este documento descreve como configurar um ambiente de staging na Vercel.

## Opções de Configuração

A Vercel oferece três formas principais de trabalhar com ambientes:

### 1. Preview Deployments (Recomendado)
- **Como funciona**: Cada PR/branch gera automaticamente um deployment preview único
- **Vantagens**: 
  - Não precisa configurar nada
  - Cada PR tem seu próprio ambiente isolado
  - URL única por PR/branch
- **Desvantagem**: URLs diferentes a cada deploy

### 2. Staging Branch (Recomendado para staging fixo)
- **Como funciona**: Um branch específico (ex: `staging`) sempre faz deploy para a mesma URL de staging
- **Vantagens**:
  - URL fixa para staging
  - Fácil de compartilhar e testar
  - Integração contínua com o branch staging
- **Configuração**: Configurar no dashboard da Vercel qual branch usar para staging

### 3. Projeto Separado
- **Como funciona**: Criar um projeto separado na Vercel para staging
- **Vantagens**: 
  - Isolamento total entre produção e staging
  - Configurações completamente independentes
- **Desvantagens**: Mais complexo de gerenciar

## Configuração Recomendada: Staging Branch

Vamos configurar usando um branch `staging` que sempre faz deploy para a mesma URL.

### Passo 1: Criar branch staging (se não existir)

```bash
git checkout -b staging
git push origin staging
```

### Passo 2: Configurar no Dashboard da Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto `likeme-back-end`
3. Vá em **Settings** → **Git**
4. Em **Production Branch**, mantenha `main` (ou `master`)
5. Em **Ignored Build Step**, pode deixar vazio ou configurar conforme necessário

### Passo 3: Configurar Branch de Staging no Dashboard

1. Vá em **Settings** → **Git** → **Branch Protection**
2. Ou configure via CLI (ver abaixo)

### Passo 4: Variáveis de Ambiente

Configure variáveis de ambiente diferentes para staging:

1. No Dashboard da Vercel:
   - Vá em **Settings** → **Environment Variables**
   - Para cada variável, selecione:
     - **Production** (apenas produção)
     - **Preview** (preview deployments, pode incluir staging)
     - **Development** (apenas desenvolvimento local)

2. Variáveis recomendadas para staging:
   ```
   NODE_ENV=staging
   DATABASE_URL=<url-do-banco-staging>
   DIRECT_URL=<url-direta-do-banco-staging>
   ```

### Passo 5: Scripts NPM (Opcional)

Já existem scripts no `package.json`:
- `vercel:deploy` - Deploy para preview/staging (não produção)
- `vercel:prod` - Deploy para produção

### Passo 6: URLs

Após configurar:
- **Production**: `https://likeme-back-end-one.vercel.app` (ou seu domínio customizado)
- **Staging**: `https://likeme-back-end-git-staging-pixel-pulse-labs.vercel.app`

Para ter uma URL mais amigável, você pode:
1. Usar um domínio customizado para staging
2. Ou usar a URL padrão da Vercel (que muda a cada deploy do branch staging)

## Comandos Úteis

### Deploy para Staging (branch staging)
```bash
git checkout staging
git merge main  # ou rebase
git push origin staging
# A Vercel fará deploy automaticamente
```

### Deploy para Production
```bash
git checkout main
git merge staging  # após testes em staging
git push origin main
# Ou usar: npm run vercel:prod
```

### Ver deployments
```bash
npx vercel ls
```

### Ver logs de staging
```bash
npx vercel logs --follow
```

## Configuração via CLI (Alternativa)

Se preferir configurar tudo via CLI:

```bash
# Login na Vercel (se ainda não fez)
npx vercel login

# Link do projeto (se ainda não linkou)
cd likeme-back-end
npx vercel link

# Deploy para preview/staging
npx vercel

# Deploy para produção
npx vercel --prod
```

## Configuração de Banco de Dados para Staging

Recomenda-se ter um banco de dados separado para staging:

1. Criar um banco de dados separado (ex: no Supabase)
2. Configurar `DATABASE_URL` e `DIRECT_URL` nas variáveis de ambiente do projeto Vercel
3. Aplicar migrations no banco de staging:
   ```bash
   DATABASE_URL=<staging-db-url> npx prisma migrate deploy
   ```

## Banco de Produção (Supabase separado)

Para manter staging isolado e evitar risco em produção:

1. **Mantenha o Supabase atual para staging**
   - Não altere `DATABASE_URL`/`DIRECT_URL` do ambiente de staging.

2. **Crie um novo projeto no Supabase para produção**
   - No painel do Supabase: **New Project**
   - Defina uma senha forte e guarde com segurança

3. **Configure as variáveis no Vercel**
   - Em **Settings → Environment Variables** do projeto `likeme-back-end`:
     - **Production**: aponte para o **novo Supabase de produção**
     - **Preview** (staging): mantenha apontando para o **Supabase atual**
   - Variáveis mínimas:
     - `DATABASE_URL` (pooling para runtime)
     - `DIRECT_URL` (conexão direta para migrations)

4. **Rode migrations no banco de produção**
   - Em ambiente local (com `.env.production` ou exportando vars):
     ```bash
     DATABASE_URL=<prod-db-url> DIRECT_URL=<prod-direct-url> npx prisma migrate deploy
     ```

5. **Seed obrigatório (se necessário)**
   - Se a aplicação depende de dados base (ex.: perguntas da anamnese), rode o seed em produção com as variáveis do banco de produção.

## Workflow Recomendado

1. **Desenvolvimento**: Trabalhar em branches de feature
2. **Staging**: Merge das features para `staging` → deploy automático
3. **Testes**: Testar em staging
4. **Production**: Merge de `staging` para `main` → deploy para produção

## Troubleshooting

### Verificar qual ambiente está rodando
O código já verifica `process.env.VERCEL` e `process.env.NODE_ENV`.

### Verificar variáveis de ambiente
```bash
npx vercel env ls
```

### Adicionar variável de ambiente
```bash
npx vercel env add DATABASE_URL staging
```

### Remover variável
```bash
npx vercel env rm DATABASE_URL staging
```

## Referências

- [Vercel Environments](https://vercel.com/docs/concepts/projects/environments)
- [Vercel Git Integration](https://vercel.com/docs/concepts/git)
- [Vercel CLI](https://vercel.com/docs/cli)

