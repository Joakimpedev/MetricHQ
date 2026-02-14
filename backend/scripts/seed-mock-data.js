/**
 * Seed mock data for MetricHQ dashboard.
 *
 * Inserts realistic TikTok, Meta, and PostHog data into the same tables
 * the real sync uses (metrics_cache, campaign_metrics, sync_log, connected_accounts).
 * The dashboard treats this identically to real data.
 *
 * Usage:
 *   node scripts/seed-mock-data.js                  # uses first user in DB
 *   node scripts/seed-mock-data.js user_abc123       # uses specific Clerk ID
 *   node scripts/seed-mock-data.js --clear           # remove all mock data for user
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ── Config ───────────────────────────────────────────────────────────
const DAYS = 30;

// Country weights (spend distribution). More spend → bigger market.
const COUNTRIES = [
  { code: 'US', weight: 0.35 },
  { code: 'GB', weight: 0.15 },
  { code: 'DE', weight: 0.12 },
  { code: 'NO', weight: 0.10 },
  { code: 'CA', weight: 0.08 },
  { code: 'AU', weight: 0.07 },
  { code: 'FR', weight: 0.06 },
  { code: 'SE', weight: 0.04 },
  { code: 'NL', weight: 0.03 },
];

// TikTok campaigns
const TIKTOK_CAMPAIGNS = [
  { id: '7340001', name: 'TT - US Broad Lookalike',     dailyBudget: 120 },
  { id: '7340002', name: 'TT - Retargeting 7d',         dailyBudget: 65 },
  { id: '7340003', name: 'TT - UK Interest Stack',      dailyBudget: 45 },
  { id: '7340004', name: 'TT - DACH CBO',               dailyBudget: 55 },
  { id: '7340005', name: 'TT - Nordics Spark Ads',      dailyBudget: 30 },
];

// Meta campaigns
const META_CAMPAIGNS = [
  { id: 'Winter Sale - Broad US',         dailyBudget: 95 },
  { id: 'Retargeting - IG + FB 14d',      dailyBudget: 70 },
  { id: 'Lookalike EU 1%',                dailyBudget: 60 },
  { id: 'ASC - All Markets',              dailyBudget: 85 },
  { id: 'Brand Awareness - Video Views',  dailyBudget: 25 },
];

// ── Helpers ──────────────────────────────────────────────────────────
function rand(min, max) {
  return min + Math.random() * (max - min);
}

function dateStr(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// Add natural daily variance: weekends dip, some days spike
function dayMultiplier(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const dow = d.getDay(); // 0=Sun, 6=Sat
  let mult = 1.0;
  if (dow === 0) mult = 0.7;       // Sunday dip
  else if (dow === 6) mult = 0.8;  // Saturday dip
  else if (dow === 2 || dow === 3) mult = 1.15; // Tue/Wed peak
  // Random daily noise ±15%
  mult *= rand(0.85, 1.15);
  return mult;
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  const arg = process.argv[2];

  // Resolve user
  let userId;
  if (arg === '--clear') {
    userId = await resolveUser(process.argv[3]);
    await clearMockData(userId);
    return;
  } else {
    userId = await resolveUser(arg);
  }

  console.log(`Seeding mock data for internal user_id=${userId}...`);

  // Ensure connected_accounts exist (so integrations page shows them as connected)
  await ensureConnectedAccounts(userId);

  // Generate and insert data
  const metricsRows = [];
  const campaignRows = [];

  for (let day = 0; day < DAYS; day++) {
    const date = dateStr(day);
    const mult = dayMultiplier(day);

    // ── TikTok ad spend (by country) ──
    for (const country of COUNTRIES) {
      const ttSpend = round2(TIKTOK_CAMPAIGNS.reduce((s, c) => s + c.dailyBudget, 0) * country.weight * mult * rand(0.8, 1.2));
      const ttImpressions = Math.round(ttSpend * rand(80, 140));
      const ttClicks = Math.round(ttImpressions * rand(0.008, 0.025));

      metricsRows.push([userId, country.code, date, 'tiktok', ttSpend, 0, ttImpressions, ttClicks, 0]);
    }

    // ── Meta ad spend (by country) ──
    for (const country of COUNTRIES) {
      const metaSpend = round2(META_CAMPAIGNS.reduce((s, c) => s + c.dailyBudget, 0) * country.weight * mult * rand(0.8, 1.2));
      const metaImpressions = Math.round(metaSpend * rand(60, 110));
      const metaClicks = Math.round(metaImpressions * rand(0.01, 0.03));

      metricsRows.push([userId, country.code, date, 'meta', metaSpend, 0, metaImpressions, metaClicks, 0]);
    }

    // ── PostHog revenue (by country) ──
    for (const country of COUNTRIES) {
      // Revenue should generally exceed spend for a profitable business (ROAS 1.5–4x)
      const totalCountrySpend = (TIKTOK_CAMPAIGNS.reduce((s, c) => s + c.dailyBudget, 0) +
                                  META_CAMPAIGNS.reduce((s, c) => s + c.dailyBudget, 0)) * country.weight * mult;
      const roas = rand(1.2, 3.8); // Some countries more profitable than others
      const revenue = round2(totalCountrySpend * roas * rand(0.85, 1.15));
      const purchases = Math.max(1, Math.round(revenue / rand(15, 65))); // $15–$65 AOV

      metricsRows.push([userId, country.code, date, 'posthog', 0, revenue, 0, 0, purchases]);
    }

    // ── TikTok campaign-level metrics ──
    for (const campaign of TIKTOK_CAMPAIGNS) {
      // Distribute across top countries for this campaign
      const topCountries = COUNTRIES.slice(0, 4 + Math.floor(Math.random() * 3));
      for (const country of topCountries) {
        const spend = round2(campaign.dailyBudget * country.weight * mult * rand(0.7, 1.3));
        const impressions = Math.round(spend * rand(80, 140));
        const clicks = Math.round(impressions * rand(0.008, 0.025));
        campaignRows.push([userId, 'tiktok', campaign.id, country.code, date, spend, impressions, clicks]);
      }
    }

    // ── Meta campaign-level metrics ──
    for (const campaign of META_CAMPAIGNS) {
      const topCountries = COUNTRIES.slice(0, 4 + Math.floor(Math.random() * 3));
      for (const country of topCountries) {
        const spend = round2(campaign.dailyBudget * country.weight * mult * rand(0.7, 1.3));
        const impressions = Math.round(spend * rand(60, 110));
        const clicks = Math.round(impressions * rand(0.01, 0.03));
        campaignRows.push([userId, 'meta', campaign.id, country.code, date, spend, impressions, clicks]);
      }
    }
  }

  // ── Batch insert (multi-row VALUES for speed over remote DB) ──
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clear existing data for this user first
    await client.query('DELETE FROM metrics_cache WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM campaign_metrics WHERE user_id = $1', [userId]);

    // Insert metrics_cache in batches of 100
    const MC_COLS = 9; // user_id, country_code, date, platform, spend, revenue, impressions, clicks, purchases
    for (let i = 0; i < metricsRows.length; i += 100) {
      const batch = metricsRows.slice(i, i + 100);
      const values = [];
      const params = [];
      batch.forEach((row, idx) => {
        const off = idx * MC_COLS;
        values.push(`($${off+1},$${off+2},$${off+3},$${off+4},$${off+5},$${off+6},$${off+7},$${off+8},$${off+9})`);
        params.push(...row);
      });
      await client.query(
        `INSERT INTO metrics_cache (user_id, country_code, date, platform, spend, revenue, impressions, clicks, purchases)
         VALUES ${values.join(',')}
         ON CONFLICT (user_id, country_code, date, platform) DO UPDATE
         SET spend=EXCLUDED.spend, revenue=EXCLUDED.revenue, impressions=EXCLUDED.impressions,
             clicks=EXCLUDED.clicks, purchases=EXCLUDED.purchases, cached_at=NOW()`,
        params
      );
    }
    console.log(`  ✓ Inserted ${metricsRows.length} metrics_cache rows`);

    // Insert campaign_metrics in batches of 100
    const CM_COLS = 8; // user_id, platform, campaign_id, country_code, date, spend, impressions, clicks
    for (let i = 0; i < campaignRows.length; i += 100) {
      const batch = campaignRows.slice(i, i + 100);
      const values = [];
      const params = [];
      batch.forEach((row, idx) => {
        const off = idx * CM_COLS;
        values.push(`($${off+1},$${off+2},$${off+3},$${off+4},$${off+5},$${off+6},$${off+7},$${off+8})`);
        params.push(...row);
      });
      await client.query(
        `INSERT INTO campaign_metrics (user_id, platform, campaign_id, country_code, date, spend, impressions, clicks)
         VALUES ${values.join(',')}
         ON CONFLICT (user_id, platform, campaign_id, country_code, date) DO UPDATE
         SET spend=EXCLUDED.spend, impressions=EXCLUDED.impressions, clicks=EXCLUDED.clicks`,
        params
      );
    }
    console.log(`  ✓ Inserted ${campaignRows.length} campaign_metrics rows`);

    // Update sync_log to show successful syncs
    for (const platform of ['tiktok', 'meta', 'posthog']) {
      await client.query(
        `INSERT INTO sync_log (user_id, platform, status, last_synced_at, records_synced)
         VALUES ($1, $2, 'done', NOW(), $3)
         ON CONFLICT (user_id, platform) DO UPDATE
         SET status = 'done', last_synced_at = NOW(), records_synced = EXCLUDED.records_synced, error_message = NULL`,
        [userId, platform, platform === 'posthog' ? metricsRows.length / 3 : campaignRows.length / 2]
      );
    }
    console.log(`  ✓ Updated sync_log for all platforms`);

    await client.query('COMMIT');
    console.log('\nDone! Dashboard should now show data.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to seed:', err.message);
    throw err;
  } finally {
    client.release();
  }

  await pool.end();
}

async function resolveUser(clerkId) {
  if (clerkId && clerkId !== '--clear') {
    // Look up by Clerk ID, create if missing
    const res = await pool.query('SELECT id FROM users WHERE clerk_user_id = $1', [clerkId]);
    if (res.rows.length > 0) return res.rows[0].id;
    const ins = await pool.query(
      `INSERT INTO users (clerk_user_id, email) VALUES ($1, $2) RETURNING id`,
      [clerkId, `${clerkId.replace(/^user_/, '')}@placeholder.local`]
    );
    return ins.rows[0].id;
  }
  // No Clerk ID given — use first user in DB
  const res = await pool.query('SELECT id, clerk_user_id FROM users ORDER BY id LIMIT 1');
  if (res.rows.length === 0) {
    console.error('No users found. Sign in first or pass a Clerk user ID.');
    process.exit(1);
  }
  console.log(`Using existing user: ${res.rows[0].clerk_user_id} (id=${res.rows[0].id})`);
  return res.rows[0].id;
}

async function ensureConnectedAccounts(userId) {
  // TikTok
  await pool.query(
    `INSERT INTO connected_accounts (user_id, platform, account_id, access_token, settings)
     VALUES ($1, 'tiktok', '7200001234', 'mock_tiktok_token', '{}')
     ON CONFLICT (user_id, platform) DO NOTHING`,
    [userId]
  );
  // Meta
  await pool.query(
    `INSERT INTO connected_accounts (user_id, platform, account_id, access_token, settings)
     VALUES ($1, 'meta', 'act_9876543210', 'mock_meta_token', '{}')
     ON CONFLICT (user_id, platform) DO NOTHING`,
    [userId]
  );
  // PostHog (don't overwrite if real credentials exist)
  await pool.query(
    `INSERT INTO connected_accounts (user_id, platform, account_id, access_token, settings)
     VALUES ($1, 'posthog', '12345', 'mock_phx_key', '{"purchaseEvent":"rc_initial_purchase","posthogHost":"https://us.posthog.com"}')
     ON CONFLICT (user_id, platform) DO NOTHING`,
    [userId]
  );
  console.log(`  ✓ Connected accounts ensured (won't overwrite existing)`);
}

async function clearMockData(userId) {
  console.log(`Clearing all metric data for user_id=${userId}...`);
  await pool.query('DELETE FROM metrics_cache WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM campaign_metrics WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM sync_log WHERE user_id = $1', [userId]);
  console.log('Done — data cleared.');
  await pool.end();
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
