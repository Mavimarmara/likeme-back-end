-- Rename product.category (product type) to product_type (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'product' AND column_name = 'category')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'product' AND column_name = 'product_type') THEN
    ALTER TABLE product RENAME COLUMN category TO product_type;
    DROP INDEX IF EXISTS product_category_idx;
    CREATE INDEX IF NOT EXISTS product_product_type_idx ON product(product_type);
  END IF;
END $$;

