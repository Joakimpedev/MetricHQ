-- Add settings JSONB to users table for dashboard preferences
ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
