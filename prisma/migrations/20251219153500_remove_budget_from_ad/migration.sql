-- Migration: Remove budget column from Ad table
-- Created: 2024-12-20
-- Purpose: Remove budget field from Ad model

-- Remove budget column
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ad' AND column_name = 'budget'
    ) THEN
        ALTER TABLE "ad" DROP COLUMN "budget";
    END IF;
END $$;

