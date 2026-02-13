const crypto = require('crypto');
const { pool } = require('../db/database');
const { getOrCreateUserByClerkId } = require('./auth');
const { getUserSubscription } = require('../services/subscription');

// POST /api/settings/api-keys — Generate a new API key
async function createApiKey(req, res) {
  const { userId, name } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);

    // Check Pro subscription with apiAccess
    const sub = await getUserSubscription(internalUserId);
    if (!sub.isActive || !sub.limits.apiAccess) {
      return res.status(403).json({ error: 'API access requires an active Pro plan' });
    }

    // Generate key: mhq_ + 32 random bytes hex
    const rawKey = 'mhq_' + crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 12) + '...';

    await pool.query(
      `INSERT INTO api_keys (user_id, name, key_hash, key_prefix)
       VALUES ($1, $2, $3, $4)`,
      [internalUserId, name || null, keyHash, keyPrefix]
    );

    // Return the full key only once
    res.json({ ok: true, key: rawKey, prefix: keyPrefix });
  } catch (error) {
    console.error('API key create error:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
}

// GET /api/settings/api-keys — List keys (prefix only)
async function listApiKeys(req, res) {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);

    const result = await pool.query(
      `SELECT id, name, key_prefix, created_at, last_used_at, revoked_at
       FROM api_keys
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [internalUserId]
    );

    res.json({ keys: result.rows });
  } catch (error) {
    console.error('API key list error:', error);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
}

// DELETE /api/settings/api-keys/:id — Soft-revoke
async function revokeApiKey(req, res) {
  const { userId } = req.query;
  const keyId = req.params.id;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);

    const result = await pool.query(
      `UPDATE api_keys SET revoked_at = NOW()
       WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
       RETURNING id`,
      [keyId, internalUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found or already revoked' });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('API key revoke error:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
}

module.exports = { createApiKey, listApiKeys, revokeApiKey };
