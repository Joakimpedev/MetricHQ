-- Add settings JSONB column to connected_accounts for per-platform config
-- (e.g. PostHog purchase event name)
ALTER TABLE connected_accounts ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
