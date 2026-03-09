-- Create activity table
CREATE TABLE IF NOT EXISTS "activity" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT,
    "end_date" TIMESTAMP(3),
    "end_time" TEXT,
    "location" TEXT,
    "reminder_enabled" BOOLEAN NOT NULL DEFAULT false,
    "reminder_offset" TEXT,

    CONSTRAINT "activity_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "activity_user_id_idx" ON "activity"("user_id");
CREATE INDEX IF NOT EXISTS "activity_type_idx" ON "activity"("type");
CREATE INDEX IF NOT EXISTS "activity_start_date_idx" ON "activity"("start_date");
CREATE INDEX IF NOT EXISTS "activity_end_date_idx" ON "activity"("end_date");

-- Add foreign key constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'activity_user_id_fkey'
    ) THEN
        ALTER TABLE "activity" 
        ADD CONSTRAINT "activity_user_id_fkey" 
        FOREIGN KEY ("user_id") 
        REFERENCES "user"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    END IF;
END $$;

