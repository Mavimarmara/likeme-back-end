-- Add description column to activity table
ALTER TABLE activity ADD COLUMN IF NOT EXISTS description TEXT;
