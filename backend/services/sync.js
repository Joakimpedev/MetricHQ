const cron = require('node-cron');
const { pool } = require('../db/database');
const { fetchAdSpend: fetchTikTokSpend } = require('./tiktok');
const { fetchAdSpend: fetchMetaSpend } = require('./meta');
const { fetchRevenueData } = require('./posthog');

// ---- Lock helpers ----

/**
 * Atomic lock: sets status='syncing' only if not already locked
 * (or lock is stale > 10 min). Returns true if lock acquired.
 */
async function acquireLock(userId, platform) {
  const result = await pool.query(
    `INSERT INTO sync_log (user_id, platform, status, started_at)
     VALUES ($1, $2, 'syncing', NOW())
     ON CONFLICT (user_id, platform) DO UPDATE
       SET status = 'syncing', started_at = NOW(), error_message = NULL
       WHERE sync_log.status != 'syncing'
          OR sync_log.started_at < NOW() - INTERVAL '10 minutes'
     RETURNING id`,
    [userId, platform]
  );
  return result.rows.length > 0;
}

/**
 * Release lock: mark done or error, update last_synced_at.
 */
async function releaseLock(userId, platform, { success, recordsSynced = 0, errorMessage = null }) {
  await pool.query(
    `UPDATE sync_log
     SET status = $3,
         last_synced_at = CASE WHEN $3 = 'done' THEN NOW() ELSE last_synced_at END,
         error_message = $4,
         records_synced = $5
     WHERE user_id = $1 AND platform = $2`,
    [userId, platform, success ? 'done' : 'error', errorMessage, recordsSynced]
  );
}

// ---- Date range helper ----

/**
 * Returns { startDate, endDate } for sync.
 * First sync (no rows): last 30 days. Incremental: last 3 days.
 */
async function getSyncDateRange(userId, platform) {
  const endDate = new Date().toISOString().slice(0, 10);

  // Check if we have any cached data for this user+platform
  const existing = await pool.query(
    `SELECT COUNT(*) as cnt FROM metrics_cache WHERE user_id = $1 AND platform = $2`,
    [userId, platform]
  );

  const hasData = parseInt(existing.rows[0].cnt, 10) > 0;
  const daysBack = hasData ? 3 : 30;

  const start = new Date();
  start.setDate(start.getDate() - daysBack);
  const startDate = start.toISOString().slice(0, 10);

  return { startDate, endDate };
}

// ---- Per-platform sync ----

async function syncTikTok(userId, accessToken, advertiserId) {
  const { startDate, endDate } = await getSyncDateRange(userId, 'tiktok');
  const locked = await acquireLock(userId, 'tiktok');
  if (!locked) return;

  try {
    const rows = await fetchTikTokSpend(accessToken, advertiserId, startDate, endDate);
    const data = rows || [];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete old rows for the sync date range
      await client.query(
        `DELETE FROM metrics_cache WHERE user_id = $1 AND platform = 'tiktok' AND date >= $2 AND date <= $3`,
        [userId, startDate, endDate]
      );
      await client.query(
        `DELETE FROM campaign_metrics WHERE user_id = $1 AND platform = 'tiktok' AND date >= $2 AND date <= $3`,
        [userId, startDate, endDate]
      );

      // Aggregate by country+date for metrics_cache, and by campaign+country+date for campaign_metrics
      for (const row of data) {
        const country = (row.country_code || row.country || '').toUpperCase().slice(0, 2);
        const spend = parseFloat(row.spend || 0);
        const impressions = parseInt(row.impressions || 0, 10);
        const clicks = parseInt(row.clicks || 0, 10);
        const campaignId = row.campaign_id || row.dimensions?.campaign_id || 'unknown';
        const date = row.stat_time_day || row.dimensions?.stat_time_day || endDate;
        const dateStr = String(date).slice(0, 10);

        if (country) {
          await client.query(
            `INSERT INTO metrics_cache (user_id, country_code, date, platform, spend, impressions, clicks)
             VALUES ($1, $2, $3, 'tiktok', $4, $5, $6)
             ON CONFLICT (user_id, country_code, date, platform) DO UPDATE
               SET spend = metrics_cache.spend + $4,
                   impressions = metrics_cache.impressions + $5,
                   clicks = metrics_cache.clicks + $6,
                   cached_at = NOW()`,
            [userId, country, dateStr, spend, impressions, clicks]
          );
        }

        await client.query(
          `INSERT INTO campaign_metrics (user_id, platform, campaign_id, country_code, date, spend, impressions, clicks)
           VALUES ($1, 'tiktok', $2, $3, $4, $5, $6, $7)
           ON CONFLICT (user_id, platform, campaign_id, country_code, date) DO UPDATE
             SET spend = $5, impressions = $6, clicks = $7`,
          [userId, campaignId, country || '', dateStr, spend, impressions, clicks]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    await releaseLock(userId, 'tiktok', { success: true, recordsSynced: data.length });
  } catch (err) {
    console.error(`[sync] TikTok sync failed for user ${userId}:`, err.message);
    await releaseLock(userId, 'tiktok', { success: false, errorMessage: err.message });
  }
}

async function syncMeta(userId, accessToken, adAccountId) {
  const { startDate, endDate } = await getSyncDateRange(userId, 'meta');
  const locked = await acquireLock(userId, 'meta');
  if (!locked) return;

  try {
    const rows = await fetchMetaSpend(accessToken, adAccountId, startDate, endDate);
    const data = rows || [];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `DELETE FROM metrics_cache WHERE user_id = $1 AND platform = 'meta' AND date >= $2 AND date <= $3`,
        [userId, startDate, endDate]
      );
      await client.query(
        `DELETE FROM campaign_metrics WHERE user_id = $1 AND platform = 'meta' AND date >= $2 AND date <= $3`,
        [userId, startDate, endDate]
      );

      for (const row of data) {
        const country = (row.country || '').toUpperCase().slice(0, 2);
        const spend = parseFloat(row.spend || 0);
        const impressions = parseInt(row.impressions || 0, 10);
        const clicks = parseInt(row.clicks || 0, 10);
        const campaignName = row.campaign_name || 'Unknown Campaign';
        // Meta insights have date_start
        const date = row.date_start || endDate;
        const dateStr = String(date).slice(0, 10);

        if (country) {
          await client.query(
            `INSERT INTO metrics_cache (user_id, country_code, date, platform, spend, impressions, clicks)
             VALUES ($1, $2, $3, 'meta', $4, $5, $6)
             ON CONFLICT (user_id, country_code, date, platform) DO UPDATE
               SET spend = metrics_cache.spend + $4,
                   impressions = metrics_cache.impressions + $5,
                   clicks = metrics_cache.clicks + $6,
                   cached_at = NOW()`,
            [userId, country, dateStr, spend, impressions, clicks]
          );
        }

        await client.query(
          `INSERT INTO campaign_metrics (user_id, platform, campaign_id, country_code, date, spend, impressions, clicks)
           VALUES ($1, 'meta', $2, $3, $4, $5, $6, $7)
           ON CONFLICT (user_id, platform, campaign_id, country_code, date) DO UPDATE
             SET spend = $5, impressions = $6, clicks = $7`,
          [userId, campaignName, country || '', dateStr, spend, impressions, clicks]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    await releaseLock(userId, 'meta', { success: true, recordsSynced: data.length });
  } catch (err) {
    console.error(`[sync] Meta sync failed for user ${userId}:`, err.message);
    await releaseLock(userId, 'meta', { success: false, errorMessage: err.message });
  }
}

async function syncPostHog(userId, apiKey, projectId, settings = {}) {
  const { startDate, endDate } = await getSyncDateRange(userId, 'posthog');
  const locked = await acquireLock(userId, 'posthog');
  if (!locked) return;

  try {
    const rows = await fetchRevenueData(apiKey, projectId, startDate, endDate, {
      purchaseEvent: settings.purchaseEvent,
      posthogHost: settings.posthogHost
    });
    const data = Array.isArray(rows) ? rows : [];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `DELETE FROM metrics_cache WHERE user_id = $1 AND platform = 'posthog' AND date >= $2 AND date <= $3`,
        [userId, startDate, endDate]
      );

      for (const row of data) {
        const country = Array.isArray(row) ? row[0] : (row.country ?? row.country_code);
        const date = Array.isArray(row) ? row[1] : row.date;
        const revenue = Array.isArray(row) ? parseFloat(row[2]) : parseFloat(row.total_revenue ?? row.revenue ?? 0);
        const purchases = Array.isArray(row) ? parseInt(row[3], 10) : parseInt(row.purchases ?? 0, 10);
        if (!country) continue;
        const code = String(country).toUpperCase().slice(0, 2);
        const dateStr = String(date).slice(0, 10);

        await client.query(
          `INSERT INTO metrics_cache (user_id, country_code, date, platform, revenue, purchases)
           VALUES ($1, $2, $3, 'posthog', $4, $5)
           ON CONFLICT (user_id, country_code, date, platform) DO UPDATE
             SET revenue = $4, purchases = $5, cached_at = NOW()`,
          [userId, code, dateStr, revenue, purchases]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    await releaseLock(userId, 'posthog', { success: true, recordsSynced: data.length });
  } catch (err) {
    console.error(`[sync] PostHog sync failed for user ${userId}:`, err.message);
    await releaseLock(userId, 'posthog', { success: false, errorMessage: err.message });
  }
}

// ---- Sync all platforms for one user ----

async function syncForUser(userId) {
  const accounts = await pool.query(
    'SELECT platform, account_id, access_token, COALESCE(settings, \'{}\'::jsonb) as settings FROM connected_accounts WHERE user_id = $1',
    [userId]
  );

  const promises = [];
  for (const acc of accounts.rows) {
    switch (acc.platform) {
      case 'tiktok':
        promises.push(syncTikTok(userId, acc.access_token, acc.account_id));
        break;
      case 'meta':
        promises.push(syncMeta(userId, acc.access_token, acc.account_id));
        break;
      case 'posthog':
        promises.push(syncPostHog(userId, acc.access_token, acc.account_id, acc.settings));
        break;
    }
  }

  await Promise.all(promises);
}

// ---- Full sync: all users ----

async function runFullSync() {
  console.log('[sync] Starting full sync for all users...');
  try {
    const users = await pool.query(
      'SELECT DISTINCT user_id FROM connected_accounts'
    );

    for (const row of users.rows) {
      try {
        await syncForUser(row.user_id);
      } catch (err) {
        console.error(`[sync] Error syncing user ${row.user_id}:`, err.message);
      }
    }

    console.log('[sync] Full sync complete.');
  } catch (err) {
    console.error('[sync] Full sync failed:', err.message);
  }
}

// ---- Cron ----

function startCronJob() {
  // Every 4 hours
  cron.schedule('0 */4 * * *', () => {
    runFullSync();
  });
  console.log('[sync] Cron job scheduled (every 4 hours)');
}

// ---- Status query ----

async function getSyncStatus(userId) {
  const result = await pool.query(
    `SELECT platform, status, last_synced_at, started_at, error_message, records_synced
     FROM sync_log WHERE user_id = $1`,
    [userId]
  );

  const platforms = {};
  let lastSynced = null;
  let isSyncing = false;

  for (const row of result.rows) {
    platforms[row.platform] = {
      status: row.status,
      lastSynced: row.last_synced_at,
      error: row.error_message,
      recordsSynced: row.records_synced
    };
    if (row.status === 'syncing') isSyncing = true;
    if (row.last_synced_at && (!lastSynced || row.last_synced_at > lastSynced)) {
      lastSynced = row.last_synced_at;
    }
  }

  return { lastSynced, isSyncing, platforms };
}

module.exports = {
  syncForUser,
  runFullSync,
  startCronJob,
  getSyncStatus
};
