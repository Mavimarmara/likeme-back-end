-- Migration: Add social.plus integration columns
-- This migration adds columns to support integration with social.plus API

-- ============================================
-- USER TABLE
-- ============================================

-- Add social_plus_user_id column to user table
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS "social_plus_user_id" VARCHAR(255);

-- Nota: registerCompletedAt e objectivesSelectedAt são calculados dinamicamente
-- Não são salvos no banco de dados

-- Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "user_social_plus_user_id_key" 
ON "user"("social_plus_user_id") 
WHERE "social_plus_user_id" IS NOT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS "user_social_plus_user_id_idx" 
ON "user"("social_plus_user_id") 
WHERE "social_plus_user_id" IS NOT NULL;

-- ============================================
-- COMMUNITY TABLE
-- ============================================

-- Create community table if it doesn't exist
CREATE TABLE IF NOT EXISTS "community" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "type" VARCHAR(255) NOT NULL,
  "avatar" TEXT,
  "social_plus_community_id" VARCHAR(255),
  "created_by" TEXT NOT NULL,
  CONSTRAINT "community_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Add unique constraint for social_plus_community_id
CREATE UNIQUE INDEX IF NOT EXISTS "community_social_plus_community_id_key" 
ON "community"("social_plus_community_id") 
WHERE "social_plus_community_id" IS NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS "community_social_plus_community_id_idx" 
ON "community"("social_plus_community_id") 
WHERE "social_plus_community_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "community_created_by_idx" 
ON "community"("created_by");

CREATE INDEX IF NOT EXISTS "community_type_idx" 
ON "community"("type");

-- ============================================
-- COMMUNITY_MEMBER TABLE
-- ============================================

-- Create community_member table if it doesn't exist
CREATE TABLE IF NOT EXISTS "community_member" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP,
  "user_id" TEXT NOT NULL,
  "community_id" TEXT NOT NULL,
  "role" VARCHAR(255) NOT NULL DEFAULT 'member',
  CONSTRAINT "community_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "community_member_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "community"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "community_member_user_id_community_id_key" UNIQUE ("user_id", "community_id")
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "community_member_user_id_idx" 
ON "community_member"("user_id");

CREATE INDEX IF NOT EXISTS "community_member_community_id_idx" 
ON "community_member"("community_id");

