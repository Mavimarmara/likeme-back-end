# Como Aplicar as Migrations

## Quando o banco estiver disponível, execute:

### Opção 1: Usando Prisma Migrate (Recomendado)
```bash
export $(cat .env | grep -v '^#' | xargs)
npx prisma migrate deploy
```

### Opção 2: Usando Prisma DB Push (Desenvolvimento)
```bash
export $(cat .env | grep -v '^#' | xargs)
npx prisma db push
```

### Opção 3: SQL Manual (se as opções acima falharem)
Execute o SQL abaixo diretamente no banco:

```sql
-- 1. Adicionar coluna pagarme_recipient_id na tabela user
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "pagarme_recipient_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "user_pagarme_recipient_id_key" ON "user"("pagarme_recipient_id");
CREATE INDEX IF NOT EXISTS "user_pagarme_recipient_id_idx" ON "user"("pagarme_recipient_id");

-- 2. Adicionar coluna seller_id na tabela product
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "seller_id" TEXT;
CREATE INDEX IF NOT EXISTS "product_seller_id_idx" ON "product"("seller_id");

-- 3. Criar tabela pagarme_recipient (se ainda não existir)
-- Verifique se a migration 20260105161341_add_pagarme_recipient_table já foi aplicada
-- Se não, execute o SQL da migration em: prisma/migrations/20260105161341_add_pagarme_recipient_table/migration.sql
```

## Migrations Pendentes

1. `20260105161341_add_pagarme_recipient_table` - Cria tabela pagarme_recipient
2. `20260105161928_add_user_recipient_and_product_seller` - Adiciona campos pagarmeRecipientId e sellerId

## Após Aplicar as Migrations

Execute os testes novamente:
```bash
npm test
```

