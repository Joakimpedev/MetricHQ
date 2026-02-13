const axios = require('axios');
const { pool } = require('../db/database');

/**
 * Refresh Google OAuth2 token if expired or within 5 min of expiry.
 * Updates DB and returns fresh access token.
 */
async function refreshGoogleToken(userId) {
  const result = await pool.query(
    `SELECT access_token, refresh_token, expires_at FROM connected_accounts
     WHERE user_id = $1 AND platform = 'google_ads'`,
    [userId]
  );

  if (result.rows.length === 0) throw new Error('Google Ads not connected');
  const { access_token, refresh_token, expires_at } = result.rows[0];

  // If token is still valid (more than 5 min from expiry), return as-is
  if (expires_at && new Date(expires_at) > new Date(Date.now() + 5 * 60 * 1000)) {
    return access_token;
  }

  if (!refresh_token) throw new Error('No Google refresh token stored');

  const response = await axios.post('https://oauth2.googleapis.com/token', {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token,
    grant_type: 'refresh_token',
  });

  const { access_token: newToken, expires_in } = response.data;
  const newExpiry = new Date(Date.now() + (expires_in || 3600) * 1000);

  await pool.query(
    `UPDATE connected_accounts
     SET access_token = $1, expires_at = $2, updated_at = NOW()
     WHERE user_id = $3 AND platform = 'google_ads'`,
    [newToken, newExpiry, userId]
  );

  return newToken;
}

/**
 * Refresh LinkedIn OAuth2 token if expired or within 5 min of expiry.
 * Updates DB and returns fresh access token.
 */
async function refreshLinkedInToken(userId) {
  const result = await pool.query(
    `SELECT access_token, refresh_token, expires_at FROM connected_accounts
     WHERE user_id = $1 AND platform = 'linkedin'`,
    [userId]
  );

  if (result.rows.length === 0) throw new Error('LinkedIn not connected');
  const { access_token, refresh_token, expires_at } = result.rows[0];

  // If token is still valid (more than 5 min from expiry), return as-is
  if (expires_at && new Date(expires_at) > new Date(Date.now() + 5 * 60 * 1000)) {
    return access_token;
  }

  if (!refresh_token) throw new Error('No LinkedIn refresh token stored');

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token,
    client_id: process.env.LINKEDIN_CLIENT_ID,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET,
  });

  const response = await axios.post(
    'https://www.linkedin.com/oauth/v2/accessToken',
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const { access_token: newToken, expires_in } = response.data;
  const newExpiry = new Date(Date.now() + (expires_in || 3600) * 1000);

  await pool.query(
    `UPDATE connected_accounts
     SET access_token = $1, expires_at = $2, updated_at = NOW()
     WHERE user_id = $3 AND platform = 'linkedin'`,
    [newToken, newExpiry, userId]
  );

  return newToken;
}

module.exports = { refreshGoogleToken, refreshLinkedInToken };
