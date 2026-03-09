-- Migration: Add externalUrl and category fields to Ad model
-- Created: 2024-12-12

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

