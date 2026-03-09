-- Add pagarme_recipient_id to user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "pagarme_recipient_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "user_pagarme_recipient_id_key" ON "user"("pagarme_recipient_id");
CREATE INDEX IF NOT EXISTS "user_pagarme_recipient_id_idx" ON "user"("pagarme_recipient_id");

-- Add seller_id to product table
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "seller_id" TEXT;
CREATE INDEX IF NOT EXISTS "product_seller_id_idx" ON "product"("seller_id");

-- Add foreign key constraint for user.pagarme_recipient_id -> pagarme_recipient.recipient_id
-- Note: This is a soft reference, not a hard foreign key constraint
