-- Combined Migration: Add externalUrl, category and make productId/advertiserId optional in Ad model
-- Created: 2024-12-15

-- Add external_url column to ad table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ad' AND column_name = 'external_url'
    ) THEN
        ALTER TABLE "ad" ADD COLUMN "external_url" TEXT;
    END IF;
END $$;

-- Add category column to ad table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ad' AND column_name = 'category'
    ) THEN
        ALTER TABLE "ad" ADD COLUMN "category" TEXT;
    END IF;
END $$;

-- Create index for category column
CREATE INDEX IF NOT EXISTS "ad_category_idx" ON "ad"("category");

-- Make advertiser_id nullable
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ad' AND column_name = 'advertiser_id' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "ad" ALTER COLUMN "advertiser_id" DROP NOT NULL;
    END IF;
END $$;

-- Make product_id nullable
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ad' AND column_name = 'product_id' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "ad" ALTER COLUMN "product_id" DROP NOT NULL;
    END IF;
END $$;

