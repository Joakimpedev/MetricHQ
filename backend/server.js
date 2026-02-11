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
    const countries = await aggregateMetrics(internalUserId, start, end);
    res.json({ countries });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Connect PostHog: store API key and project ID for the user
app.post('/api/settings/posthog', async (req, res) => {
  const { userId, apiKey, projectId } = req.body || {};

  if (!userId || !apiKey || !projectId) {
    return res.status(400).json({
      error: 'userId, apiKey, and projectId are required'
    });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    await pool.query(
      `INSERT INTO connected_accounts (user_id, platform, account_id, access_token)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, platform) DO UPDATE
       SET account_id = $3, access_token = $4, updated_at = NOW()`,
      [internalUserId, 'posthog', String(projectId).trim(), String(apiKey).trim()]
    );
    res.json({ ok: true, message: 'PostHog connected' });
  } catch (error) {
    console.error('PostHog settings error:', error);
    res.status(500).json({ error: 'Failed to save PostHog settings' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
});
