-- Add icon field to custom_sources for visual identification on dashboard
ALTER TABLE custom_sources ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT NULL;
