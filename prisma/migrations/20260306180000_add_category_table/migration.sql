-- CreateCategoryTable
CREATE TABLE IF NOT EXISTS "category" (
  "id"         TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  "name"       TEXT NOT NULL,

  CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "category_name_idx" ON "category"("name");
