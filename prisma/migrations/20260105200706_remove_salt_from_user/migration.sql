-- Remove salt column from user table
ALTER TABLE "user" DROP COLUMN IF EXISTS "salt";
