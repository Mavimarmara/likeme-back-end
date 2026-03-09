-- Add payment_transaction_id column to order table
ALTER TABLE "order" 
ADD COLUMN IF NOT EXISTS "payment_transaction_id" TEXT;

-- Add index for faster lookups by transaction ID
CREATE INDEX IF NOT EXISTS "order_payment_transaction_id_idx" ON "order"("payment_transaction_id");

