-- Add KPI bar support to event display items
ALTER TABLE event_display_items ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) DEFAULT 'standard';
ALTER TABLE event_display_items ADD COLUMN IF NOT EXISTS label VARCHAR(255);
ALTER TABLE event_display_items ADD COLUMN IF NOT EXISTS rate_event_name VARCHAR(255);
ALTER TABLE event_display_items ADD COLUMN IF NOT EXISTS rate_property_name VARCHAR(255);
ALTER TABLE event_display_items ADD COLUMN IF NOT EXISTS rate_property_value VARCHAR(255);
