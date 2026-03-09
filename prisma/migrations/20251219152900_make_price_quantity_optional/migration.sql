-- Migration: Make price and quantity optional in Product table
-- Created: 2024-12-20
-- Purpose: Allow price and quantity to be NULL when product has externalUrl

-- Step 1: Make price nullable
DO $$ 
BEGIN
    -- Check if price column exists and is NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product' 
        AND column_name = 'price' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "product" ALTER COLUMN "price" DROP NOT NULL;
    END IF;
END $$;

-- Step 2: Make quantity nullable (remove default constraint first if needed)
DO $$ 
BEGIN
    -- Check if quantity column exists and is NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product' 
        AND column_name = 'quantity' 
        AND is_nullable = 'NO'
    ) THEN
        -- Remove default constraint if it exists
        ALTER TABLE "product" ALTER COLUMN "quantity" DROP DEFAULT;
        -- Make it nullable
        ALTER TABLE "product" ALTER COLUMN "quantity" DROP NOT NULL;
    END IF;
END $$;

-- Step 3: Update existing products with externalUrl to have NULL price/quantity if they're 0
UPDATE "product"
SET 
    price = CASE WHEN external_url IS NOT NULL AND price = 0 THEN NULL ELSE price END,
    quantity = CASE WHEN external_url IS NOT NULL AND quantity = 0 THEN NULL ELSE quantity END
WHERE external_url IS NOT NULL;

