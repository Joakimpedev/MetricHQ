CREATE TABLE IF NOT EXISTS event_display_sections (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  section_type TEXT NOT NULL DEFAULT 'table',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_event_display_sections_user ON event_display_sections(user_id);

CREATE TABLE IF NOT EXISTS event_display_items (
  id SERIAL PRIMARY KEY,
  section_id INT NOT NULL REFERENCES event_display_sections(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  property_name TEXT,
  property_value TEXT,
  display_order INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_event_display_items_section ON event_display_items(section_id);
