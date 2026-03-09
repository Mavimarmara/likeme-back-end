-- Migration: Make productId and advertiserId optional (nullable) in Ad table
-- Created: 2024-12-15

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

