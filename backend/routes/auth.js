const express = require('express');
const router = express.Router();
const axios = require('axios');
const { pool } = require('../db/database');

/**
 * Get or create our internal user by Clerk user id. Returns internal user id.
 */
async function getOrCreateUserByClerkId(clerkUserId) {
  const existing = await pool.query(
    'SELECT id FROM users WHERE clerk_user_id = $1',
    [clerkUserId]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  const placeholderEmail = `${String(clerkUserId).replace(/^user_/, '')}@placeholder.local`;
  const insert = await pool.query(
    `INSERT INTO users (clerk_user_id, email) VALUES ($1, $2)
     ON CONFLICT (clerk_user_id) DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [clerkUserId, placeholderEmail]
  );
  return insert.rows[0]?.id;
}

// ----- TikTok OAuth -----

router.get('/tiktok', (req, res) => {
  const { userId } = req.query; // Clerk user id from frontend
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }
  if (!process.env.TIKTOK_APP_ID) {
    return res.status(503).json({ error: 'TikTok app not configured' });
  }

  const authUrl = 'https://business-api.tiktok.com/portal/auth';
  const params = new URLSearchParams({
    app_id: process.env.TIKTOK_APP_ID,
    state: userId,
    redirect_uri: `${process.env.BACKEND_URL}/auth/tiktok/callback`,
    rid: Date.now().toString()
  });

  res.redirect(`${authUrl}?${params}`);
});

router.get('/tiktok/callback', async (req, res) => {
  const { auth_code, state: clerkUserId } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (!auth_code || !clerkUserId) {
    return res.redirect(`${frontendUrl}?error=tiktok_missing_params`);
  }

  try {
    const response = await axios.post(
      'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/',
      {
        app_id: process.env.TIKTOK_APP_ID,
        secret: process.env.TIKTOK_APP_SECRET,
        auth_code
      }
    );

    const data = response.data?.data;
    if (!data?.access_token) {
      throw new Error(data?.message || 'No access_token in response');
    }

    const { access_token, advertiser_ids } = data;
    const accountId = Array.isArray(advertiser_ids) && advertiser_ids[0]
      ? String(advertiser_ids[0])
      : null;

    const internalUserId = await getOrCreateUserByClerkId(clerkUserId);
    await pool.query(
      `INSERT INTO connected_accounts (user_id, platform, account_id, access_token)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, platform) DO UPDATE
       SET account_id = $3, access_token = $4, updated_at = NOW()`,
      [internalUserId, 'tiktok', accountId, access_token]
    );

    res.redirect(`${frontendUrl}?tiktok=connected`);
  } catch (error) {
    console.error('TikTok OAuth error:', error.response?.data || error.message);
    res.redirect(`${frontendUrl}?error=tiktok_failed`);
  }
});

// ----- Meta OAuth -----

router.get('/meta', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }
  if (!process.env.META_APP_ID) {
    return res.status(503).json({ error: 'Meta app not configured' });
  }

  const authUrl = 'https://www.facebook.com/v19.0/dialog/oauth';
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: `${process.env.BACKEND_URL}/auth/meta/callback`,
    state: userId,
    scope: 'ads_read,read_insights'
  });

  res.redirect(`${authUrl}?${params}`);
});

router.get('/meta/callback', async (req, res) => {
  const { code, state: clerkUserId } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (!code || !clerkUserId) {
    return res.redirect(`${frontendUrl}?error=meta_missing_params`);
  }

  try {
    const tokenResponse = await axios.get(
      'https://graph.facebook.com/v19.0/oauth/access_token',
      {
        params: {
          client_id: process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          redirect_uri: `${process.env.BACKEND_URL}/auth/meta/callback`,
          code
        }
      }
    );

    const { access_token } = tokenResponse.data;
    if (!access_token) throw new Error('No access_token');

    const accountsResponse = await axios.get(
      'https://graph.facebook.com/v19.0/me/adaccounts',
      { params: { access_token } }
    );

    const accounts = accountsResponse.data?.data || [];
    const adAccountId = accounts[0]?.id || null;

    const internalUserId = await getOrCreateUserByClerkId(clerkUserId);
    await pool.query(
      `INSERT INTO connected_accounts (user_id, platform, account_id, access_token)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, platform) DO UPDATE
       SET account_id = $3, access_token = $4, updated_at = NOW()`,
      [internalUserId, 'meta', adAccountId, access_token]
    );

    res.redirect(`${frontendUrl}?meta=connected`);
  } catch (error) {
    console.error('Meta OAuth error:', error.response?.data || error.message);
    res.redirect(`${frontendUrl}?error=meta_failed`);
  }
});

module.exports = router;
module.exports.getOrCreateUserByClerkId = getOrCreateUserByClerkId;
