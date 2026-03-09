-- CreateTable
CREATE TABLE IF NOT EXISTS "pagarme_recipient" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "recipient_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "code" TEXT,
    "payment_mode" TEXT,
    "transfer_enabled" BOOLEAN DEFAULT true,
    "transfer_interval" TEXT,
    "transfer_day" INTEGER,
    "is_default" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "pagarme_recipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "pagarme_recipient_recipient_id_key" ON "pagarme_recipient"("recipient_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "pagarme_recipient_code_key" ON "pagarme_recipient"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pagarme_recipient_recipient_id_idx" ON "pagarme_recipient"("recipient_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pagarme_recipient_code_idx" ON "pagarme_recipient"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pagarme_recipient_is_default_idx" ON "pagarme_recipient"("is_default");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pagarme_recipient_status_idx" ON "pagarme_recipient"("status");

