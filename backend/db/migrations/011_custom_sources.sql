-- Custom sources: user-defined ad spend platforms (Reddit, Bing, etc.)
CREATE TABLE IF NOT EXISTS custom_sources (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  track_impressions BOOLEAN DEFAULT false,
  track_clicks BOOLEAN DEFAULT false,
  track_conversions BOOLEAN DEFAULT false,
  track_revenue BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_custom_sources_user ON custom_sources(user_id);
