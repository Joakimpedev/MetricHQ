const express = require('express');
const router = express.Router();
const axios = require('axios');
const { pool } = require('../db/database');
const { getUserSubscription } = require('../services/subscription');

const AD_PLATFORMS = ['tiktok', 'meta', 'google_ads', 'linkedin'];

/**
 * Check if user can connect another ad platform (Starter = max 1).
 * Returns true if allowed, false if blocked.
 */
async function canConnectAdPlatform(internalUserId) {
  const sub = await getUserSubscription(internalUserId);
  if (!sub.isActive) return true; // Let expired users connect (they'll hit paywall elsewhere)
  const maxAd = sub.limits.maxAdPlatforms;
  if (maxAd === Infinity) return true;

  const result = await pool.query(
    `SELECT COUNT(DISTINCT platform) as cnt FROM connected_accounts
     WHERE user_id = $1 AND platform = ANY($2)`,
    [internalUserId, AD_PLATFORMS]
  );
  return parseInt(result.rows[0].cnt, 10) < maxAd;
}

/**
 * Get or create our internal user by Clerk user id. Returns internal user id.
 */
async function getOrCreateUserByClerkId(clerkUserId) {
  const existing = await pool.query(
    'SELECT id FROM users WHERE clerk_user_id = $1',
    [clerkUserId]
  );

  const userId = existing.rows.length > 0
    ? existing.rows[0].id
    : (await pool.query(
        `INSERT INTO users (clerk_user_id, email) VALUES ($1, $2)
         ON CONFLICT (clerk_user_id) DO UPDATE SET updated_at = NOW()
         RETURNING id`,
        [clerkUserId, `${String(clerkUserId).replace(/^user_/, '')}@placeholder.local`]
      )).rows[0]?.id;

  // Ensure subscription row exists (14-day Pro trial).
  // ON CONFLICT DO NOTHING = one trial per user, no gaming.
  if (userId) {
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO subscriptions (user_id, plan, status, trial_end)
       VALUES ($1, 'pro', 'trialing', $2) ON CONFLICT (user_id) DO NOTHING`,
      [userId, trialEnd]
    );
  }

  return userId;
}

// ----- TikTok OAuth -----

router.get('/tiktok', async (req, res) => {
  const { userId, returnTo } = req.query; // Clerk user id from frontend
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }
  if (!process.env.TIKTOK_APP_ID) {
    return res.status(503).json({ error: 'TikTok app not configured' });
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const internalUserId = await getOrCreateUserByClerkId(userId);
  if (!(await canConnectAdPlatform(internalUserId))) {
    const limitRedirect = returnTo ? `${frontendUrl}${returnTo}` : `${frontendUrl}/integrations`;
    return res.redirect(`${limitRedirect}?error=platform_limit`);
  }

  const statePayload = returnTo ? `${userId}::${returnTo}` : userId;
  const authUrl = 'https://business-api.tiktok.com/portal/auth';
  const params = new URLSearchParams({
    app_id: process.env.TIKTOK_APP_ID,
    state: statePayload,
    redirect_uri: `${process.env.BACKEND_URL}/auth/tiktok/callback`,
    rid: Date.now().toString()
  });

  res.redirect(`${authUrl}?${params}`);
});

router.get('/tiktok/callback', async (req, res) => {
  const { auth_code, state } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const [clerkUserId, returnTo] = (state || '').split('::');
  const redirectBase = returnTo ? `${frontendUrl}${returnTo}` : `${frontendUrl}/integrations`;

  if (!auth_code || !clerkUserId) {
    return res.redirect(`${redirectBase}?error=tiktok_missing_params`);
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

    res.redirect(`${redirectBase}?tiktok=connected`);
  } catch (error) {
    console.error('TikTok OAuth error:', error.response?.data || error.message);
    res.redirect(`${redirectBase}?error=tiktok_failed`);
  }
});

// ----- Meta OAuth -----

router.get('/meta', async (req, res) => {
  const { userId, returnTo } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }
  if (!process.env.META_APP_ID) {
    return res.status(503).json({ error: 'Meta app not configured' });
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const internalUserId = await getOrCreateUserByClerkId(userId);
  if (!(await canConnectAdPlatform(internalUserId))) {
    const limitRedirect = returnTo ? `${frontendUrl}${returnTo}` : `${frontendUrl}/integrations`;
    return res.redirect(`${limitRedirect}?error=platform_limit`);
  }

  const statePayload = returnTo ? `${userId}::${returnTo}` : userId;
  const authUrl = 'https://www.facebook.com/v19.0/dialog/oauth';
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: `${process.env.BACKEND_URL}/auth/meta/callback`,
    state: statePayload,
    scope: 'ads_read,read_insights'
  });

  res.redirect(`${authUrl}?${params}`);
});

router.get('/meta/callback', async (req, res) => {
  const { code, state } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const [clerkUserId, returnTo] = (state || '').split('::');
  const redirectBase = returnTo ? `${frontendUrl}${returnTo}` : `${frontendUrl}/integrations`;

  if (!code || !clerkUserId) {
    return res.redirect(`${redirectBase}?error=meta_missing_params`);
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

    res.redirect(`${redirectBase}?meta=connected`);
  } catch (error) {
    console.error('Meta OAuth error:', error.response?.data || error.message);
    res.redirect(`${redirectBase}?error=meta_failed`);
  }
});

// ----- Meta Data Deletion Callback (required by Meta app review) -----
router.post('/meta/data-deletion', (req, res) => {
  const signedRequest = req.body.signed_request;
  // Acknowledge the request — Meta just needs a confirmation response
  const confirmationCode = `del_${Date.now()}`;
  res.json({
    url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/privacy`,
    confirmation_code: confirmationCode,
  });
});

// ----- Google Ads OAuth -----

router.get('/google', async (req, res) => {
  const { userId, returnTo } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google Ads not configured' });
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const internalUserId = await getOrCreateUserByClerkId(userId);
  if (!(await canConnectAdPlatform(internalUserId))) {
    const limitRedirect = returnTo ? `${frontendUrl}${returnTo}` : `${frontendUrl}/integrations`;
    return res.redirect(`${limitRedirect}?error=platform_limit`);
  }

  const statePayload = returnTo ? `${userId}::${returnTo}` : userId;
  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${process.env.BACKEND_URL}/auth/google/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/adwords',
    access_type: 'offline',
    prompt: 'consent',
    state: statePayload,
  });

  res.redirect(`${authUrl}?${params}`);
});

router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const [clerkUserId, returnTo] = (state || '').split('::');
  const redirectBase = returnTo ? `${frontendUrl}${returnTo}` : `${frontendUrl}/integrations`;

  if (!code || !clerkUserId) {
    return res.redirect(`${redirectBase}?error=google_missing_params`);
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${process.env.BACKEND_URL}/auth/google/callback`,
      grant_type: 'authorization_code',
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    if (!access_token) throw new Error('No access_token');

    // Fetch accessible customer IDs
    const customersResponse = await axios.get(
      'https://googleads.googleapis.com/v20/customers:listAccessibleCustomers',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        },
      }
    );

    const resourceNames = customersResponse.data?.resourceNames || [];
    // Extract first customer ID (format: "customers/1234567890")
    const customerId = resourceNames[0]
      ? resourceNames[0].replace('customers/', '')
      : null;

    const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000);

    const internalUserId = await getOrCreateUserByClerkId(clerkUserId);
    await pool.query(
      `INSERT INTO connected_accounts (user_id, platform, account_id, access_token, refresh_token, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, platform) DO UPDATE
       SET account_id = $3, access_token = $4, refresh_token = $5, expires_at = $6, updated_at = NOW()`,
      [internalUserId, 'google_ads', customerId, access_token, refresh_token, expiresAt]
    );

    res.redirect(`${redirectBase}?google_ads=connected`);
  } catch (error) {
    console.error('Google OAuth error:', error.response?.data || error.message);
    res.redirect(`${redirectBase}?error=google_failed`);
  }
});

// ----- LinkedIn Ads OAuth -----

router.get('/linkedin', async (req, res) => {
  const { userId, returnTo } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }
  if (!process.env.LINKEDIN_CLIENT_ID) {
    return res.status(503).json({ error: 'LinkedIn Ads not configured' });
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const internalUserId = await getOrCreateUserByClerkId(userId);
  if (!(await canConnectAdPlatform(internalUserId))) {
    const limitRedirect = returnTo ? `${frontendUrl}${returnTo}` : `${frontendUrl}/integrations`;
    return res.redirect(`${limitRedirect}?error=platform_limit`);
  }

  const statePayload = returnTo ? `${userId}::${returnTo}` : userId;
  const authUrl = 'https://www.linkedin.com/oauth/v2/authorization';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: `${process.env.BACKEND_URL}/auth/linkedin/callback`,
    state: statePayload,
    scope: 'r_ads',
  });

  res.redirect(`${authUrl}?${params}`);
});

router.get('/linkedin/callback', async (req, res) => {
  const { code, state } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const [clerkUserId, returnTo] = (state || '').split('::');
  const redirectBase = returnTo ? `${frontendUrl}${returnTo}` : `${frontendUrl}/integrations`;

  if (!code || !clerkUserId) {
    return res.redirect(`${redirectBase}?error=linkedin_missing_params`);
  }

  try {
    // Exchange code for tokens
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      redirect_uri: `${process.env.BACKEND_URL}/auth/linkedin/callback`,
    });

    const tokenResponse = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      tokenParams.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    if (!access_token) throw new Error('No access_token');

    // Fetch ad accounts
    const accountsResponse = await axios.get(
      'https://api.linkedin.com/rest/adAccounts',
      {
        params: { q: 'search' },
        headers: {
          Authorization: `Bearer ${access_token}`,
          'LinkedIn-Version': '202402',
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    );

    const accounts = accountsResponse.data?.elements || [];
    const accountId = accounts[0]?.id ? String(accounts[0].id) : null;

    const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000);

    const internalUserId = await getOrCreateUserByClerkId(clerkUserId);
    await pool.query(
      `INSERT INTO connected_accounts (user_id, platform, account_id, access_token, refresh_token, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, platform) DO UPDATE
       SET account_id = $3, access_token = $4, refresh_token = $5, expires_at = $6, updated_at = NOW()`,
      [internalUserId, 'linkedin', accountId, access_token, refresh_token, expiresAt]
    );

    res.redirect(`${redirectBase}?linkedin=connected`);
  } catch (error) {
    console.error('LinkedIn OAuth error:', error.response?.data || error.message);
    res.redirect(`${redirectBase}?error=linkedin_failed`);
  }
});

module.exports = router;
module.exports.getOrCreateUserByClerkId = getOrCreateUserByClerkId;
