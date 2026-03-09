-- Migration: Add Product, Order, OrderItem, Advertiser and Ad models
-- Created: 2024-12-12

-- Create Product table
CREATE TABLE IF NOT EXISTS "product" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "cost" DECIMAL(10,2),
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "image" TEXT,
    "category" TEXT,
    "brand" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "weight" DECIMAL(10,3),
    "dimensions" TEXT,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- Create unique index for SKU
CREATE UNIQUE INDEX IF NOT EXISTS "product_sku_key" ON "product"("sku");

-- Ensure product.category exists (table may have been created without it)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'product' AND column_name = 'category'
    ) THEN
        ALTER TABLE "product" ADD COLUMN "category" TEXT;
    END IF;
END $$;

-- Create indexes for Product
CREATE INDEX IF NOT EXISTS "product_sku_idx" ON "product"("sku");
CREATE INDEX IF NOT EXISTS "product_name_idx" ON "product"("name");
CREATE INDEX IF NOT EXISTS "product_category_idx" ON "product"("category");
CREATE INDEX IF NOT EXISTS "product_status_idx" ON "product"("status");
CREATE INDEX IF NOT EXISTS "product_quantity_idx" ON "product"("quantity");

-- Create Order table
CREATE TABLE IF NOT EXISTS "order" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "shipping_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "shipping_address" TEXT,
    "billing_address" TEXT,
    "notes" TEXT,
    "payment_method" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "tracking_number" TEXT,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- Create indexes for Order
CREATE INDEX IF NOT EXISTS "order_user_id_idx" ON "order"("user_id");
CREATE INDEX IF NOT EXISTS "order_status_idx" ON "order"("status");
CREATE INDEX IF NOT EXISTS "order_payment_status_idx" ON "order"("payment_status");
CREATE INDEX IF NOT EXISTS "order_created_at_idx" ON "order"("created_at");

-- Create OrderItem table
CREATE TABLE IF NOT EXISTS "order_item" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_item_pkey" PRIMARY KEY ("id")
);

-- Create indexes for OrderItem
CREATE INDEX IF NOT EXISTS "order_item_order_id_idx" ON "order_item"("order_id");
CREATE INDEX IF NOT EXISTS "order_item_product_id_idx" ON "order_item"("product_id");

-- Create Advertiser table
CREATE TABLE IF NOT EXISTS "advertiser" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "website" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "advertiser_pkey" PRIMARY KEY ("id")
);

-- Create unique index for Advertiser user_id
CREATE UNIQUE INDEX IF NOT EXISTS "advertiser_user_id_key" ON "advertiser"("user_id");

-- Create indexes for Advertiser
CREATE INDEX IF NOT EXISTS "advertiser_user_id_idx" ON "advertiser"("user_id");
CREATE INDEX IF NOT EXISTS "advertiser_status_idx" ON "advertiser"("status");

-- Create Ad table
CREATE TABLE IF NOT EXISTS "ad" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "advertiser_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "target_audience" TEXT,
    "budget" DECIMAL(10,2),

    CONSTRAINT "ad_pkey" PRIMARY KEY ("id")
);

-- Create indexes for Ad
CREATE INDEX IF NOT EXISTS "ad_advertiser_id_idx" ON "ad"("advertiser_id");
CREATE INDEX IF NOT EXISTS "ad_product_id_idx" ON "ad"("product_id");
CREATE INDEX IF NOT EXISTS "ad_status_idx" ON "ad"("status");
CREATE INDEX IF NOT EXISTS "ad_start_date_idx" ON "ad"("start_date");
CREATE INDEX IF NOT EXISTS "ad_end_date_idx" ON "ad"("end_date");

-- Add foreign keys
-- Order -> User
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'order_user_id_fkey'
    ) THEN
        ALTER TABLE "order" ADD CONSTRAINT "order_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- OrderItem -> Order
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'order_item_order_id_fkey'
    ) THEN
        ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_fkey" 
        FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- OrderItem -> Product
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'order_item_product_id_fkey'
    ) THEN
        ALTER TABLE "order_item" ADD CONSTRAINT "order_item_product_id_fkey" 
        FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Advertiser -> User
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'advertiser_user_id_fkey'
    ) THEN
        ALTER TABLE "advertiser" ADD CONSTRAINT "advertiser_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Ad -> Advertiser
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ad_advertiser_id_fkey'
    ) THEN
        ALTER TABLE "ad" ADD CONSTRAINT "ad_advertiser_id_fkey" 
        FOREIGN KEY ("advertiser_id") REFERENCES "advertiser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Ad -> Product
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ad_product_id_fkey'
    ) THEN
        ALTER TABLE "ad" ADD CONSTRAINT "ad_product_id_fkey" 
        FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

