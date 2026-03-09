-- Migration: Move title, description, image, external_url and category from Ad to Product
-- Created: 2024-12-20
-- Purpose: Centralize product information in Product table, Ad only references Product

-- Step 1: Add external_url and category to Product if they don't exist
DO $$ 
BEGIN
    -- Add external_url to product
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product' AND column_name = 'external_url'
    ) THEN
        ALTER TABLE "product" ADD COLUMN "external_url" TEXT;
        CREATE INDEX IF NOT EXISTS "product_external_url_idx" ON "product"("external_url");
    END IF;
    
    -- Category already exists in product, but ensure it's there
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product' AND column_name = 'category'
    ) THEN
        ALTER TABLE "product" ADD COLUMN "category" TEXT;
    END IF;
END $$;

-- Step 2: Migrate data from Ad to Product (only if ad still has title column)
DO $$ 
DECLARE
    ad_record RECORD;
    new_product_id TEXT;
    ad_has_title boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ad' AND column_name = 'title'
    ) INTO ad_has_title;
    
    IF ad_has_title THEN
        FOR ad_record IN 
            SELECT id, product_id, title, description, image, external_url, category
            FROM "ad"
            WHERE deleted_at IS NULL
        LOOP
        -- If ad has a productId, update the product with ad data
        IF ad_record.product_id IS NOT NULL THEN
            -- Update product with ad data (prioritize external_url data if present)
            UPDATE "product"
            SET 
                name = COALESCE(
                    CASE WHEN ad_record.external_url IS NOT NULL THEN NULL ELSE product.name END,
                    product.name,
                    ad_record.title
                ),
                description = COALESCE(
                    CASE WHEN ad_record.external_url IS NOT NULL THEN NULL ELSE product.description END,
                    product.description,
                    ad_record.description
                ),
                image = COALESCE(
                    CASE WHEN ad_record.external_url IS NOT NULL THEN NULL ELSE product.image END,
                    product.image,
                    ad_record.image
                ),
                external_url = COALESCE(product.external_url, ad_record.external_url),
                category = COALESCE(product.category, ad_record.category),
                updated_at = CURRENT_TIMESTAMP
                WHERE id = ad_record.product_id
                AND deleted_at IS NULL;
        ELSE
            -- If ad doesn't have productId but has data, create a new product
            IF ad_record.external_url IS NOT NULL OR ad_record.title IS NOT NULL THEN
                INSERT INTO "product" (
                    id, created_at, updated_at, name, description, image, 
                    external_url, category, price, quantity, status
                )
                VALUES (
                    gen_random_uuid(),
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    ad_record.title,
                    ad_record.description,
                    ad_record.image,
                    ad_record.external_url,
                    ad_record.category,
                    0,
                    0,
                    'active'
                )
                RETURNING id INTO new_product_id;
                
                -- Link the ad to the new product
                UPDATE "ad"
                SET product_id = new_product_id
                WHERE id = ad_record.id;
            END IF;
        END IF;
        END LOOP;
    END IF;
END $$;

-- Step 3: Remove columns from Ad table
DO $$ 
BEGIN
    -- Remove title
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ad' AND column_name = 'title'
    ) THEN
        ALTER TABLE "ad" DROP COLUMN "title";
    END IF;
    
    -- Remove description
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ad' AND column_name = 'description'
    ) THEN
        ALTER TABLE "ad" DROP COLUMN "description";
    END IF;
    
    -- Remove image
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ad' AND column_name = 'image'
    ) THEN
        ALTER TABLE "ad" DROP COLUMN "image";
    END IF;
    
    -- Remove external_url
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ad' AND column_name = 'external_url'
    ) THEN
        ALTER TABLE "ad" DROP COLUMN "external_url";
    END IF;
    
    -- Remove category (index will be dropped automatically if exists)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ad' AND column_name = 'category'
    ) THEN
        ALTER TABLE "ad" DROP COLUMN "category";
    END IF;
END $$;

-- Step 4: Drop category index from ad if it exists
DROP INDEX IF EXISTS "ad_category_idx";

