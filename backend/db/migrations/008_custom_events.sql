CREATE TABLE IF NOT EXISTS custom_event_sections (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  title TEXT,
  group_by_property TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_custom_event_sections_user ON custom_event_sections(user_id);

CREATE TABLE IF NOT EXISTS custom_event_cache (
  id SERIAL PRIMARY KEY,
  section_id INT NOT NULL REFERENCES custom_event_sections(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  property_value TEXT NOT NULL DEFAULT '_total',
  count INT NOT NULL DEFAULT 0,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_event_cache_unique
  ON custom_event_cache(section_id, date, property_value);
