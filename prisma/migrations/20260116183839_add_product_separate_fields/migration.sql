-- AlterTable
ALTER TABLE "product" 
ADD COLUMN IF NOT EXISTS "variation" TEXT,
ADD COLUMN IF NOT EXISTS "target_audience" TEXT,
ADD COLUMN IF NOT EXISTS "technical_specifications" TEXT;

-- Add indexes for new fields if needed
CREATE INDEX IF NOT EXISTS "product_variation_idx" ON "product"("variation");
