-- Add revenue and purchases columns to campaign_metrics
-- Enables campaign-level profit tracking (Stripe UTM attribution)
ALTER TABLE campaign_metrics ADD COLUMN IF NOT EXISTS revenue DECIMAL(10,2) DEFAULT 0;
ALTER TABLE campaign_metrics ADD COLUMN IF NOT EXISTS purchases INT DEFAULT 0;
