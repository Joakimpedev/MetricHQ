-- Background sync: campaign-level metrics storage
CREATE TABLE IF NOT EXISTS campaign_metrics (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  campaign_id VARCHAR(255) NOT NULL,
  country_code VARCHAR(10),
  date DATE NOT NULL,
  spend DECIMAL(10,2) DEFAULT 0,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  UNIQUE(user_id, platform, campaign_id, country_code, date)
);

CREATE INDEX IF NOT EXISTS idx_campaign_metrics_user_date
  ON campaign_metrics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_platform
  ON campaign_metrics(user_id, platform, date);

-- Background sync: lock / status log per user+platform
CREATE TABLE IF NOT EXISTS sync_log (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  last_synced_at TIMESTAMP,
  started_at TIMESTAMP,
  error_message TEXT,
  records_synced INT DEFAULT 0,
  UNIQUE(user_id, platform)
);
