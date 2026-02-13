-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Connected accounts
CREATE TABLE connected_accounts (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'tiktok', 'meta', 'posthog'
  account_id VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Cached metrics
CREATE TABLE metrics_cache (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  country_code VARCHAR(2) NOT NULL,
  date DATE NOT NULL,
  platform VARCHAR(50) NOT NULL, -- 'tiktok', 'meta', 'posthog'
  spend DECIMAL(10,2),
  revenue DECIMAL(10,2),
  impressions INT,
  clicks INT,
  purchases INT,
  cached_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, country_code, date, platform)
);

-- Indexes for performance
CREATE INDEX idx_metrics_user_date ON metrics_cache(user_id, date);
CREATE INDEX idx_connected_accounts_user ON connected_accounts(user_id);

-- Waitlist (Phase 2 Week 5)
CREATE TABLE waitlist (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_waitlist_email ON waitlist(email);

-- Campaign-level metrics (background sync)
CREATE TABLE campaign_metrics (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  campaign_id VARCHAR(255) NOT NULL,
  country_code VARCHAR(10),
  date DATE NOT NULL,
  spend DECIMAL(10,2) DEFAULT 0,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  purchases INT DEFAULT 0,
  UNIQUE(user_id, platform, campaign_id, country_code, date)
);

CREATE INDEX idx_campaign_metrics_user_date ON campaign_metrics(user_id, date);
CREATE INDEX idx_campaign_metrics_platform ON campaign_metrics(user_id, platform, date);

-- Sync status log (background sync)
CREATE TABLE sync_log (
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
