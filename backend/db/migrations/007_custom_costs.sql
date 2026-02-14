CREATE TABLE IF NOT EXISTS custom_costs (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  cost_type TEXT NOT NULL DEFAULT 'fixed',       -- 'fixed' or 'variable'
  currency TEXT NOT NULL DEFAULT 'USD',
  amount NUMERIC(12,2),                          -- fixed costs
  percentage NUMERIC(8,4),                       -- variable costs (5.5 = 5.5%)
  base_metric TEXT,                              -- 'revenue','profit','google_ads_spend','meta_spend','tiktok_spend','linkedin_spend','total_ad_spend'
  repeat BOOLEAN NOT NULL DEFAULT false,
  repeat_interval TEXT,                          -- 'daily','weekly','monthly'
  start_date DATE NOT NULL,
  end_date DATE,                                 -- nullable for repeating costs with no end
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_custom_costs_user ON custom_costs(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_costs_dates ON custom_costs(user_id, start_date, end_date);
