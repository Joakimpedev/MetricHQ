const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { pool } = require('../db/database');
const { aggregateMetrics } = require('../services/aggregator');
const { getUserSubscription } = require('../services/subscription');
const { resolveDataOwner } = require('../services/team');

// --- Rate limiter: in-memory, 100 req/hour per key hash ---
const rateLimitMap = new Map();
const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Cleanup stale entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_WINDOW_MS) {
      rateLimitMap.delete(key);
    }
  }
}, RATE_WINDOW_MS);

function checkRateLimit(keyHash) {
  const now = Date.now();
  let entry = rateLimitMap.get(keyHash);

  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    entry = { windowStart: now, count: 0 };
    rateLimitMap.set(keyHash, entry);
  }

  entry.count++;
  const remaining = Math.max(0, RATE_LIMIT - entry.count);
  const resetAt = new Date(entry.windowStart + RATE_WINDOW_MS);

  return {
    allowed: entry.count <= RATE_LIMIT,
    remaining,
    resetAt,
  };
}

// --- Auth middleware for /api/v1/* ---
router.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7);
  if (!token.startsWith('mhq_')) {
    return res.status(401).json({ error: 'Invalid API key format' });
  }

  const keyHash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    // Look up key (must not be revoked)
    const keyResult = await pool.query(
      `SELECT id, user_id FROM api_keys
       WHERE key_hash = $1 AND revoked_at IS NULL`,
      [keyHash]
    );

    if (keyResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or revoked API key' });
    }

    const { id: keyId, user_id: keyUserId } = keyResult.rows[0];

    // Check subscription has apiAccess
    const sub = await getUserSubscription(keyUserId);
    if (!sub.isActive || !sub.limits.apiAccess) {
      return res.status(403).json({ error: 'API access requires an active Pro plan' });
    }

    // Rate limiting
    const rateCheck = checkRateLimit(keyHash);
    res.set('X-RateLimit-Limit', String(RATE_LIMIT));
    res.set('X-RateLimit-Remaining', String(rateCheck.remaining));
    res.set('X-RateLimit-Reset', rateCheck.resetAt.toISOString());

    if (!rateCheck.allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded. Max 100 requests per hour.' });
    }

    // Resolve data owner (team member support)
    const dataOwnerId = await resolveDataOwner(keyUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Team owner no longer has an active Pro plan' });
    }

    // Update last_used_at (fire-and-forget)
    pool.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [keyId]).catch(() => {});

    req.apiUserId = dataOwnerId;
    next();
  } catch (error) {
    console.error('API v1 auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Helper: parse date range from query params
function parseDateRange(query) {
  const end = query.endDate || new Date().toISOString().slice(0, 10);
  const start = query.startDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  })();
  return { start, end };
}

// GET /api/v1/metrics — Summary
router.get('/metrics', async (req, res) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const data = await aggregateMetrics(req.apiUserId, start, end);
    res.json({ summary: data.summary });
  } catch (error) {
    console.error('API v1 metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// GET /api/v1/metrics/timeseries — Daily time series
router.get('/metrics/timeseries', async (req, res) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const data = await aggregateMetrics(req.apiUserId, start, end);
    res.json({ timeSeries: data.timeSeries });
  } catch (error) {
    console.error('API v1 timeseries error:', error);
    res.status(500).json({ error: 'Failed to fetch time series' });
  }
});

// GET /api/v1/metrics/countries — Country breakdown
router.get('/metrics/countries', async (req, res) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const data = await aggregateMetrics(req.apiUserId, start, end);
    res.json({ countries: data.countries });
  } catch (error) {
    console.error('API v1 countries error:', error);
    res.status(500).json({ error: 'Failed to fetch country data' });
  }
});

// GET /api/v1/metrics/campaigns — Campaign data by platform
router.get('/metrics/campaigns', async (req, res) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const data = await aggregateMetrics(req.apiUserId, start, end);
    res.json({ campaigns: data.campaigns });
  } catch (error) {
    console.error('API v1 campaigns error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign data' });
  }
});

module.exports = router;
