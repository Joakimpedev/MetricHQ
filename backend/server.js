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
app.use(express.json());

// Auth routes (TikTok, Meta OAuth)
const authRoutes = require('./routes/auth');
const { getOrCreateUserByClerkId } = authRoutes;
app.use('/auth', authRoutes);

const { aggregateMetrics } = require('./services/aggregator');
const { syncForUser, startCronJob, getSyncStatus } = require('./services/sync');
const { pool } = require('./db/database');

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend running!' });
});

// Real metrics from connected accounts (PostHog, TikTok, Meta)
app.get('/api/metrics', async (req, res) => {
  const { userId, startDate, endDate } = req.query;

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
    const data = await aggregateMetrics(internalUserId, start, end);
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
    const result = await pool.query(
      'SELECT platform, account_id, access_token, settings, updated_at FROM connected_accounts WHERE user_id = $1',
      [internalUserId]
    );

    const connections = {};
    result.rows.forEach(row => {
      const conn = {
        connected: true,
        accountId: row.account_id,
        updatedAt: row.updated_at,
        settings: row.settings || {}
      };
      // Return masked API key for PostHog so the UI can show what's stored
      if (row.platform === 'posthog' && row.access_token) {
        const key = row.access_token;
        conn.maskedKey = key.length > 8
          ? key.slice(0, 6) + '...' + key.slice(-4)
          : '••••••••';
      }
      connections[row.platform] = conn;
    });

    let sync = { lastSynced: null, isSyncing: false, platforms: {} };
    try { sync = await getSyncStatus(internalUserId); } catch {}
    res.json({ connections, sync });
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
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
    const settings = {};
    if (purchaseEvent) settings.purchaseEvent = purchaseEvent;
    if (posthogHost) settings.posthogHost = posthogHost.replace(/\/+$/, '');

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

// Save PostHog purchase event selection (separate from credentials)
app.post('/api/settings/posthog/event', async (req, res) => {
  const { userId, purchaseEvent } = req.body || {};

  if (!userId || !purchaseEvent) {
    return res.status(400).json({ error: 'userId and purchaseEvent are required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
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
    const account = await pool.query(
      "SELECT access_token, account_id, COALESCE(settings, '{}'::jsonb) as settings FROM connected_accounts WHERE user_id = $1 AND platform = 'posthog'",
      [internalUserId]
    );

    if (account.rows.length === 0) {
      return res.status(404).json({ error: 'PostHog not connected' });
    }

    const { access_token: apiKey, account_id: projectId, settings } = account.rows[0];

    // Use stored host first, then try fallbacks
    const hostsToTry = settings.posthogHost
      ? [settings.posthogHost, ...POSTHOG_HOSTS.filter(h => h !== settings.posthogHost)]
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
            [JSON.stringify({ posthogHost: host }), internalUserId]
          );
        }

        return res.json({ events });
      } catch (err) {
        lastError = err;
        continue;
      }
    }

    // All hosts failed
    console.error('PostHog events fetch error (all hosts):', lastError?.response?.data || lastError?.message);
    res.status(502).json({
      error: 'Could not reach PostHog API. Check your API key and Project ID.',
      detail: lastError?.response?.data?.detail || lastError?.message
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
    const status = await getSyncStatus(internalUserId);
    res.json(status);
  } catch (error) {
    console.error('Sync status error:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  startCronJob();
});
