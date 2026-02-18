CREATE TABLE IF NOT EXISTS campaign_settings (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  campaign_id VARCHAR(255) NOT NULL,
  country_attribution VARCHAR(10) NOT NULL DEFAULT 'none',
  country_code VARCHAR(10) DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform, campaign_id)
);
