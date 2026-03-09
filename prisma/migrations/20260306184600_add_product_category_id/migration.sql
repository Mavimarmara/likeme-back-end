-- Add category_id to product (or rename domain_category_id if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'product' AND column_name = 'domain_category_id') THEN
    ALTER TABLE product RENAME COLUMN domain_category_id TO category_id;
    DROP INDEX IF EXISTS product_domain_category_id_idx;
    CREATE INDEX IF NOT EXISTS product_category_id_idx ON product(category_id);
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'product' AND column_name = 'category_id') THEN
    ALTER TABLE product ADD COLUMN category_id TEXT REFERENCES category(id);
    CREATE INDEX IF NOT EXISTS product_category_id_idx ON product(category_id);
  END IF;
END $$;

