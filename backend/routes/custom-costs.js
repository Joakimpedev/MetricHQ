const { pool } = require('../db/database');
const { getOrCreateUserByClerkId } = require('./auth');
const { resolveDataOwner } = require('../services/team');

const VALID_COST_TYPES = ['fixed', 'variable'];
const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'NOK'];
const VALID_INTERVALS = ['daily', 'weekly', 'monthly'];
const VALID_BASE_METRICS = ['revenue', 'profit', 'google_ads_spend', 'meta_spend', 'tiktok_spend', 'linkedin_spend', 'total_ad_spend'];

// POST /api/custom-costs
async function createCustomCost(req, res) {
  const { userId, name, category, cost_type, currency, amount, percentage, base_metric, repeat, repeat_interval, start_date, end_date } = req.body || {};

  if (!userId || !name || !start_date) {
    return res.status(400).json({ error: 'userId, name, and start_date are required' });
  }

  const type = cost_type || 'fixed';
  if (!VALID_COST_TYPES.includes(type)) {
    return res.status(400).json({ error: 'cost_type must be "fixed" or "variable"' });
  }

  if (type === 'fixed' && (amount === undefined || amount === null)) {
    return res.status(400).json({ error: 'amount is required for fixed costs' });
  }

  if (type === 'variable') {
    if (percentage === undefined || percentage === null) {
      return res.status(400).json({ error: 'percentage is required for variable costs' });
    }
    if (!base_metric || !VALID_BASE_METRICS.includes(base_metric)) {
      return res.status(400).json({ error: 'base_metric is required for variable costs' });
    }
  }

  if (currency && !VALID_CURRENCIES.includes(currency)) {
    return res.status(400).json({ error: 'Invalid currency' });
  }

  if (repeat && repeat_interval && !VALID_INTERVALS.includes(repeat_interval)) {
    return res.status(400).json({ error: 'Invalid repeat_interval' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `INSERT INTO custom_costs (user_id, name, category, cost_type, currency, amount, percentage, base_metric, repeat, repeat_interval, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [dataOwnerId, name.trim(), category?.trim() || null, type, currency || 'USD', amount || null, percentage || null, base_metric || null, !!repeat, repeat_interval || null, start_date, end_date || null]
    );

    res.json({ ok: true, cost: result.rows[0] });
  } catch (error) {
    console.error('Create custom cost error:', error);
    res.status(500).json({ error: 'Failed to create custom cost' });
  }
}

// GET /api/custom-costs?userId=X&search=&page=&limit=
async function listCustomCosts(req, res) {
  const { userId, search, page = '1', limit = '20' } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * lim;

    let whereClause = 'WHERE user_id = $1';
    const params = [dataOwnerId];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      whereClause += ` AND (name ILIKE $${params.length} OR category ILIKE $${params.length})`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM custom_costs ${whereClause}`,
      params
    );

    const dataResult = await pool.query(
      `SELECT * FROM custom_costs ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, lim, offset]
    );

    res.json({
      costs: dataResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
      page: pageNum,
      limit: lim,
    });
  } catch (error) {
    console.error('List custom costs error:', error);
    res.status(500).json({ error: 'Failed to list custom costs' });
  }
}

// PUT /api/custom-costs/:id
async function updateCustomCost(req, res) {
  const { userId, ...fields } = req.body || {};
  const costId = req.params.id;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Ownership check
    const existing = await pool.query(
      'SELECT id FROM custom_costs WHERE id = $1 AND user_id = $2',
      [costId, dataOwnerId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Custom cost not found' });
    }

    // Build dynamic update
    const allowed = ['name', 'category', 'cost_type', 'currency', 'amount', 'percentage', 'base_metric', 'repeat', 'repeat_interval', 'start_date', 'end_date'];
    const sets = [];
    const values = [];
    let paramIdx = 1;

    for (const key of allowed) {
      if (key in fields) {
        sets.push(`${key} = $${paramIdx}`);
        values.push(fields[key] === '' ? null : fields[key]);
        paramIdx++;
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    sets.push(`updated_at = NOW()`);
    values.push(costId, dataOwnerId);

    const result = await pool.query(
      `UPDATE custom_costs SET ${sets.join(', ')} WHERE id = $${paramIdx} AND user_id = $${paramIdx + 1} RETURNING *`,
      values
    );

    res.json({ ok: true, cost: result.rows[0] });
  } catch (error) {
    console.error('Update custom cost error:', error);
    res.status(500).json({ error: 'Failed to update custom cost' });
  }
}

// DELETE /api/custom-costs/:id
async function deleteCustomCost(req, res) {
  const { userId } = req.query;
  const costId = req.params.id;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      'DELETE FROM custom_costs WHERE id = $1 AND user_id = $2 RETURNING id',
      [costId, dataOwnerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Custom cost not found' });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Delete custom cost error:', error);
    res.status(500).json({ error: 'Failed to delete custom cost' });
  }
}

// GET /api/custom-costs/categories?userId=X
async function listCategories(req, res) {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      'SELECT DISTINCT category FROM custom_costs WHERE user_id = $1 AND category IS NOT NULL ORDER BY category',
      [dataOwnerId]
    );

    res.json({ categories: result.rows.map(r => r.category) });
  } catch (error) {
    console.error('List categories error:', error);
    res.status(500).json({ error: 'Failed to list categories' });
  }
}

module.exports = { createCustomCost, listCustomCosts, updateCustomCost, deleteCustomCost, listCategories };
