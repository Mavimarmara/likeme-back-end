-- Migration: Fix ad_product_id_fkey to allow NULL values
-- Created: 2024-12-20
-- Purpose: Allow product_id to be NULL when ad has externalUrl

-- Drop the existing foreign key constraint
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ad_product_id_fkey'
    ) THEN
        ALTER TABLE "ad" DROP CONSTRAINT "ad_product_id_fkey";
    END IF;
END $$;

-- Recreate the foreign key constraint
-- PostgreSQL foreign keys allow NULL by default, so this will work correctly
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ad_product_id_fkey'
    ) THEN
        ALTER TABLE "ad" ADD CONSTRAINT "ad_product_id_fkey" 
        FOREIGN KEY ("product_id") REFERENCES "product"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

