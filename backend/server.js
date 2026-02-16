const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize DB connection (when DATABASE_URL is set)
require('./db/database');

const app = express();
const PORT = process.env.PORT || 4000;

// CORS: allow frontend (localhost + production)
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  credentials: true
}));

// Stripe webhook needs raw body — must be registered BEFORE express.json()
const { handleWebhook } = require('./routes/billing');
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(express.json());

// Auth routes (TikTok, Meta OAuth)
const authRoutes = require('./routes/auth');
const { getOrCreateUserByClerkId } = authRoutes;
app.use('/auth', authRoutes);

const { aggregateMetrics } = require('./services/aggregator');
const { syncForUser, startCronJob, getSyncStatus } = require('./services/sync');
const { getUserSubscription } = require('./services/subscription');
const { resolveDataOwner } = require('./services/team');
const { pool } = require('./db/database');
const billing = require('./routes/billing');

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend running!' });
});

// Real metrics from connected accounts (PostHog, TikTok, Meta)
app.get('/api/metrics', async (req, res) => {
  const { userId, startDate, endDate, compareStartDate, compareEndDate, chartStartDate, chartEndDate } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId (Clerk user id) is required' });
  }

  const end = endDate || new Date().toISOString().slice(0, 10);
  const start = startDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  })();

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'team_owner_downgraded', message: "Your team owner's Pro plan is no longer active. Contact them to restore access." });
    }
    const data = await aggregateMetrics(dataOwnerId, start, end);

    // Comparison period (summary + timeSeries for ghost chart)
    if (compareStartDate && compareEndDate) {
      const prev = await aggregateMetrics(dataOwnerId, compareStartDate, compareEndDate);
      data.comparison = { summary: prev.summary, timeSeries: prev.timeSeries };
    }

    // Separate chart date range (graph may show a wider range than KPIs)
    if (chartStartDate && chartEndDate) {
      const chartData = await aggregateMetrics(dataOwnerId, chartStartDate, chartEndDate);
      data.timeSeries = chartData.timeSeries;
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Integration status: which platforms are connected for this user
app.get('/api/connections', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Team owner no longer has an active Pro plan' });
    }
    const result = await pool.query(
      'SELECT platform, account_id, access_token, settings, updated_at, created_at FROM connected_accounts WHERE user_id = $1 ORDER BY created_at ASC',
      [dataOwnerId]
    );

    const connections = {};
    result.rows.forEach(row => {
      const conn = {
        connected: true,
        accountId: row.account_id,
        updatedAt: row.updated_at,
        createdAt: row.created_at,
        settings: row.settings || {}
      };
      // Return masked + full API key for PostHog so the UI can toggle visibility
      if (row.platform === 'posthog' && row.access_token) {
        const key = row.access_token;
        conn.maskedKey = key.length > 8
          ? key.slice(0, 6) + '••••••••' + key.slice(-4)
          : '••••••••••••';
        conn.fullKey = key;
      }
      // Return masked + full API key for Stripe
      if (row.platform === 'stripe' && row.access_token) {
        const key = row.access_token;
        conn.maskedKey = key.length > 8
          ? key.slice(0, 6) + '••••••••' + key.slice(-4)
          : '••••••••••••';
        conn.fullKey = key;
      }
      connections[row.platform] = conn;
    });

    let sync = { lastSynced: null, isSyncing: false, platforms: {} };
    try { sync = await getSyncStatus(dataOwnerId); } catch {}
    res.json({ connections, sync });
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

// Disconnect a platform
app.delete('/api/connections/:platform', async (req, res) => {
  const { userId } = req.query;
  const { platform } = req.params;

  if (!userId || !platform) {
    return res.status(400).json({ error: 'userId and platform are required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await pool.query(
      'DELETE FROM connected_accounts WHERE user_id = $1 AND platform = $2',
      [dataOwnerId, platform]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Error disconnecting platform:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// Waitlist signup (Phase 2 Week 5 - no auth required)
app.post('/api/waitlist', async (req, res) => {
  const { email } = req.body || {};
  const trimmed = typeof email === 'string' ? email.trim() : '';

  if (!trimmed) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    await pool.query(
      'INSERT INTO waitlist (email) VALUES ($1) ON CONFLICT (email) DO NOTHING',
      [trimmed.toLowerCase()]
    );
    res.json({ ok: true, message: "You're on the list! We'll be in touch." });
  } catch (error) {
    console.error('Waitlist signup error:', error);
    res.status(500).json({ error: 'Failed to join waitlist' });
  }
});

/**
 * Normalize PostHog host: convert ingestion URLs (us.i.posthog.com)
 * to API URLs (us.posthog.com) since the REST API lives on the non-.i. host.
 */
function normalizePostHogHost(host) {
  if (!host) return 'https://us.posthog.com';
  let h = host.trim().replace(/\/+$/, '');
  // us.i.posthog.com → us.posthog.com  /  eu.i.posthog.com → eu.posthog.com
  h = h.replace(/\.i\.posthog\.com/, '.posthog.com');
  // Ensure https://
  if (!h.startsWith('http')) h = 'https://' + h;
  return h;
}

// Connect PostHog: store API key, project ID, host, and purchase event name
app.post('/api/settings/posthog', async (req, res) => {
  const { userId, apiKey, projectId, purchaseEvent, posthogHost } = req.body || {};

  if (!userId || !apiKey || !projectId) {
    return res.status(400).json({
      error: 'userId, apiKey, and projectId are required'
    });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Team owner no longer has an active Pro plan' });
    }
    if (dataOwnerId !== internalUserId) {
      return res.status(403).json({ error: 'Only the team owner can modify integrations' });
    }
    const settings = {};
    if (purchaseEvent) settings.purchaseEvent = purchaseEvent;
    if (posthogHost) settings.posthogHost = normalizePostHogHost(posthogHost);

    await pool.query(
      `INSERT INTO connected_accounts (user_id, platform, account_id, access_token, settings)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, platform) DO UPDATE
       SET account_id = $3, access_token = $4, settings = connected_accounts.settings || $5, updated_at = NOW()`,
      [internalUserId, 'posthog', String(projectId).trim(), String(apiKey).trim(), JSON.stringify(settings)]
    );
    res.json({ ok: true, message: 'PostHog connected' });
  } catch (error) {
    console.error('PostHog settings error:', error);
    res.status(500).json({ error: 'Failed to save PostHog settings' });
  }
});

// Connect Stripe: store API key
app.post('/api/settings/stripe', async (req, res) => {
  const { userId, apiKey } = req.body || {};

  if (!userId || !apiKey) {
    return res.status(400).json({ error: 'userId and apiKey are required' });
  }

  if (!/^(sk|rk)_(test|live)_/.test(apiKey.trim())) {
    return res.status(400).json({ error: 'Invalid Stripe key format. Must start with sk_ or rk_' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Team owner no longer has an active Pro plan' });
    }
    if (dataOwnerId !== internalUserId) {
      return res.status(403).json({ error: 'Only the team owner can modify integrations' });
    }
    await pool.query(
      `INSERT INTO connected_accounts (user_id, platform, account_id, access_token)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, platform) DO UPDATE
       SET access_token = $4, updated_at = NOW()`,
      [internalUserId, 'stripe', 'stripe_account', apiKey.trim()]
    );
    res.json({ ok: true, message: 'Stripe connected' });
  } catch (error) {
    console.error('Stripe settings error:', error);
    res.status(500).json({ error: 'Failed to save Stripe settings' });
  }
});

// Save PostHog purchase event selection (separate from credentials)
app.post('/api/settings/posthog/event', async (req, res) => {
  const { userId, purchaseEvent } = req.body || {};

  if (!userId || !purchaseEvent) {
    return res.status(400).json({ error: 'userId and purchaseEvent are required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Team owner no longer has an active Pro plan' });
    }
    if (dataOwnerId !== internalUserId) {
      return res.status(403).json({ error: 'Only the team owner can modify integrations' });
    }
    await pool.query(
      `UPDATE connected_accounts
       SET settings = COALESCE(settings, '{}'::jsonb) || $1, updated_at = NOW()
       WHERE user_id = $2 AND platform = 'posthog'`,
      [JSON.stringify({ purchaseEvent }), internalUserId]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('PostHog event save error:', error);
    res.status(500).json({ error: 'Failed to save event selection' });
  }
});

// Fetch PostHog event names for auto-detection
const axios = require('axios');
const POSTHOG_HOSTS = ['https://us.posthog.com', 'https://eu.posthog.com', 'https://app.posthog.com'];

app.get('/api/posthog/events', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Team owner no longer has an active Pro plan' });
    }
    const account = await pool.query(
      "SELECT access_token, account_id, COALESCE(settings, '{}'::jsonb) as settings FROM connected_accounts WHERE user_id = $1 AND platform = 'posthog'",
      [dataOwnerId]
    );

    if (account.rows.length === 0) {
      return res.status(404).json({ error: 'PostHog not connected' });
    }

    const { access_token: apiKey, account_id: projectId, settings } = account.rows[0];

    // Use stored host first (normalized), then try fallbacks
    const storedHost = settings.posthogHost ? normalizePostHogHost(settings.posthogHost) : null;
    const hostsToTry = storedHost
      ? [storedHost, ...POSTHOG_HOSTS.filter(h => h !== storedHost)]
      : POSTHOG_HOSTS;

    let lastError = null;
    for (const host of hostsToTry) {
      try {
        const response = await axios.get(
          `${host}/api/projects/${projectId}/event_definitions/`,
          {
            params: { limit: 200 },
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: 10000
          }
        );

        const events = (response.data?.results || [])
          .map(e => e.name)
          .filter(name => !name.startsWith('$'))
          .sort();

        // Remember which host worked
        if (!settings.posthogHost || settings.posthogHost !== host) {
          await pool.query(
            `UPDATE connected_accounts SET settings = COALESCE(settings, '{}'::jsonb) || $1 WHERE user_id = $2 AND platform = 'posthog'`,
            [JSON.stringify({ posthogHost: host }), dataOwnerId]
          );
        }

        return res.json({ events });
      } catch (err) {
        lastError = err;
        continue;
      }
    }

    // All hosts failed
    const keyPreview = apiKey ? apiKey.slice(0, 8) + '...' : 'empty';
    console.error(`PostHog events failed for project ${projectId}, key ${keyPreview}, hosts tried: ${hostsToTry.join(', ')}`, lastError?.response?.data || lastError?.message);
    res.status(502).json({
      error: 'Could not connect to PostHog.',
      detail: lastError?.response?.data?.detail || lastError?.response?.data?.attr || lastError?.message
    });
  } catch (error) {
    console.error('PostHog events endpoint error:', error.message);
    res.status(500).json({ error: 'Internal error fetching events' });
  }
});

// Manual sync trigger (fire-and-forget)
app.post('/api/sync', async (req, res) => {
  const { userId } = req.body || {};

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Team owner no longer has an active Pro plan' });
    }
    if (dataOwnerId !== internalUserId) {
      return res.status(403).json({ error: 'Only the team owner can trigger syncs' });
    }

    // Enforce sync interval based on subscription tier
    const sub = await getUserSubscription(internalUserId);
    const intervalHours = sub.limits.syncIntervalHours;
    if (intervalHours && isFinite(intervalHours)) {
      const lastSync = await pool.query(
        `SELECT MAX(last_synced_at) as last FROM sync_log WHERE user_id = $1 AND status = 'done'`,
        [internalUserId]
      );
      const lastSyncedAt = lastSync.rows[0]?.last;
      if (lastSyncedAt) {
        const nextSyncAt = new Date(new Date(lastSyncedAt).getTime() + intervalHours * 3600000);
        if (nextSyncAt > new Date()) {
          return res.status(429).json({ ok: false, error: 'sync_cooldown', nextSyncAt: nextSyncAt.toISOString() });
        }
      }
    }

    // Fire-and-forget: start sync in background, respond immediately
    syncForUser(internalUserId).catch(err => {
      console.error('Background sync error:', err.message);
    });
    res.json({ ok: true, message: 'Sync started' });
  } catch (error) {
    console.error('Sync trigger error:', error);
    res.status(500).json({ error: 'Failed to start sync' });
  }
});

// Sync status for dashboard indicator
app.get('/api/sync/status', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Team owner no longer has an active Pro plan' });
    }
    const status = await getSyncStatus(dataOwnerId);
    res.json(status);
  } catch (error) {
    console.error('Sync status error:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

// Billing routes (webhook already registered above with raw body)
app.get('/api/billing/subscription', billing.getSubscription);
app.post('/api/billing/checkout', billing.createCheckout);
app.post('/api/billing/portal', billing.createPortal);
app.get('/api/billing/downgrade-impact', billing.getDowngradeImpact);

// Team routes
const teamRoutes = require('./routes/team');
app.use('/api/team', teamRoutes);

// Custom costs routes
const customCosts = require('./routes/custom-costs');
app.get('/api/custom-costs/categories', customCosts.listCategories);
app.get('/api/custom-costs', customCosts.listCustomCosts);
app.post('/api/custom-costs', customCosts.createCustomCost);
app.put('/api/custom-costs/:id', customCosts.updateCustomCost);
app.delete('/api/custom-costs/:id', customCosts.deleteCustomCost);

// Custom events routes
const customEvents = require('./routes/custom-events');
app.get('/api/custom-events/properties', customEvents.getEventProperties);
app.get('/api/custom-events/sections', customEvents.listSections);
app.post('/api/custom-events/sections', customEvents.createSection);
app.put('/api/custom-events/sections/:id', customEvents.updateSection);
app.delete('/api/custom-events/sections/:id', customEvents.deleteSection);
app.get('/api/custom-events/sections/:id/data', customEvents.getSectionData);
app.post('/api/custom-events/sync', customEvents.syncAllSections);

// API key management routes (Clerk-authed)
const apiKeys = require('./routes/api-keys');
app.post('/api/settings/api-keys', apiKeys.createApiKey);
app.get('/api/settings/api-keys', apiKeys.listApiKeys);
app.delete('/api/settings/api-keys/:id', apiKeys.revokeApiKey);

// Public API v1 routes (API key auth)
const apiV1Routes = require('./routes/api-v1');
app.use('/api/v1', apiV1Routes);

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  startCronJob();
});
