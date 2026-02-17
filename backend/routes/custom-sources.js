const { pool } = require('../db/database');
const { getOrCreateUserByClerkId } = require('./auth');
const { resolveDataOwner } = require('../services/team');

// POST /api/custom-sources
async function createSource(req, res) {
  const { userId, name, track_impressions, track_clicks, track_conversions, track_revenue } = req.body || {};

  if (!userId || !name?.trim()) {
    return res.status(400).json({ error: 'userId and name are required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `INSERT INTO custom_sources (user_id, name, track_impressions, track_clicks, track_conversions, track_revenue)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [dataOwnerId, name.trim(), !!track_impressions, !!track_clicks, !!track_conversions, !!track_revenue]
    );

    res.json({ ok: true, source: result.rows[0] });
  } catch (error) {
    console.error('Create custom source error:', error);
    res.status(500).json({ error: 'Failed to create custom source' });
  }
}

// GET /api/custom-sources?userId=X
async function listSources(req, res) {
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
      'SELECT * FROM custom_sources WHERE user_id = $1 ORDER BY created_at ASC',
      [dataOwnerId]
    );

    res.json({ sources: result.rows });
  } catch (error) {
    console.error('List custom sources error:', error);
    res.status(500).json({ error: 'Failed to list custom sources' });
  }
}

// PUT /api/custom-sources/:id
async function updateSource(req, res) {
  const { userId, ...fields } = req.body || {};
  const sourceId = req.params.id;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const existing = await pool.query(
      'SELECT id FROM custom_sources WHERE id = $1 AND user_id = $2',
      [sourceId, dataOwnerId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Custom source not found' });
    }

    const allowed = ['name', 'track_impressions', 'track_clicks', 'track_conversions', 'track_revenue'];
    const sets = [];
    const values = [];
    let paramIdx = 1;

    for (const key of allowed) {
      if (key in fields) {
        sets.push(`${key} = $${paramIdx}`);
        values.push(key === 'name' ? (fields[key] || '').trim() : !!fields[key]);
        paramIdx++;
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(sourceId, dataOwnerId);
    const result = await pool.query(
      `UPDATE custom_sources SET ${sets.join(', ')} WHERE id = $${paramIdx} AND user_id = $${paramIdx + 1} RETURNING *`,
      values
    );

    res.json({ ok: true, source: result.rows[0] });
  } catch (error) {
    console.error('Update custom source error:', error);
    res.status(500).json({ error: 'Failed to update custom source' });
  }
}

// DELETE /api/custom-sources/:id
async function deleteSource(req, res) {
  const { userId } = req.query;
  const sourceId = req.params.id;
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
      'DELETE FROM custom_sources WHERE id = $1 AND user_id = $2 RETURNING id',
      [sourceId, dataOwnerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Custom source not found' });
    }

    // Clean up all data from campaign_metrics and metrics_cache for this source
    const platform = `custom_${sourceId}`;
    await pool.query('DELETE FROM campaign_metrics WHERE user_id = $1 AND platform = $2', [dataOwnerId, platform]);
    await pool.query('DELETE FROM metrics_cache WHERE user_id = $1 AND platform = $2', [dataOwnerId, platform]);

    res.json({ ok: true });
  } catch (error) {
    console.error('Delete custom source error:', error);
    res.status(500).json({ error: 'Failed to delete custom source' });
  }
}

// GET /api/custom-sources/:id/entries?userId=X&page=&limit=&date=YYYY-MM-DD
async function listEntries(req, res) {
  const { userId, page = '1', limit = '20', date } = req.query;
  const sourceId = req.params.id;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Verify source ownership
    const source = await pool.query(
      'SELECT id FROM custom_sources WHERE id = $1 AND user_id = $2',
      [sourceId, dataOwnerId]
    );
    if (source.rows.length === 0) {
      return res.status(404).json({ error: 'Custom source not found' });
    }

    const platform = `custom_${sourceId}`;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * lim;

    // Optional date filter
    const dateFilter = date ? ' AND date = $3' : '';
    const baseParams = [dataOwnerId, platform];
    const dateParams = date ? [String(date).slice(0, 10)] : [];

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM campaign_metrics WHERE user_id = $1 AND platform = $2${dateFilter}`,
      [...baseParams, ...dateParams]
    );

    const dataResult = await pool.query(
      `SELECT id, campaign_id, country_code, date, spend, impressions, clicks, revenue, purchases
       FROM campaign_metrics WHERE user_id = $1 AND platform = $2${dateFilter}
       ORDER BY date DESC, campaign_id ASC
       LIMIT $${baseParams.length + dateParams.length + 1} OFFSET $${baseParams.length + dateParams.length + 2}`,
      [...baseParams, ...dateParams, lim, offset]
    );

    res.json({
      entries: dataResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
      page: pageNum,
      limit: lim,
    });
  } catch (error) {
    console.error('List custom source entries error:', error);
    res.status(500).json({ error: 'Failed to list entries' });
  }
}

// POST /api/custom-sources/:id/entries
async function createEntry(req, res) {
  const { userId, date, campaign, country, spend, impressions, clicks, revenue, purchases } = req.body || {};
  const sourceId = req.params.id;

  if (!userId || !date || spend === undefined || spend === null) {
    return res.status(400).json({ error: 'userId, date, and spend are required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Verify source ownership and get source name for default campaign
    const source = await pool.query(
      'SELECT id, name FROM custom_sources WHERE id = $1 AND user_id = $2',
      [sourceId, dataOwnerId]
    );
    if (source.rows.length === 0) {
      return res.status(404).json({ error: 'Custom source not found' });
    }

    const platform = `custom_${sourceId}`;
    const campaignId = (campaign || '').trim() || source.rows[0].name;
    const countryCode = (country || '').trim() || '';
    const dateStr = String(date).slice(0, 10);

    // Insert into campaign_metrics with ON CONFLICT DO UPDATE
    const cmResult = await pool.query(
      `INSERT INTO campaign_metrics (user_id, platform, campaign_id, country_code, date, spend, impressions, clicks, revenue, purchases)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (user_id, platform, campaign_id, country_code, date) DO UPDATE
         SET spend = $6, impressions = $7, clicks = $8, revenue = $9, purchases = $10
       RETURNING id`,
      [dataOwnerId, platform, campaignId, countryCode, dateStr,
       parseFloat(spend) || 0, parseInt(impressions) || 0, parseInt(clicks) || 0,
       parseFloat(revenue) || 0, parseInt(purchases) || 0]
    );

    // Recalculate metrics_cache for this platform+date+country
    await recalcMetricsCache(dataOwnerId, platform, dateStr, countryCode);

    res.json({ ok: true, entryId: cmResult.rows[0].id });
  } catch (error) {
    console.error('Create custom source entry error:', error);
    res.status(500).json({ error: 'Failed to create entry' });
  }
}

// PUT /api/custom-sources/:id/entries/:entryId
async function updateEntry(req, res) {
  const { userId, date, campaign, country, spend, impressions, clicks, revenue, purchases } = req.body || {};
  const { id: sourceId, entryId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const platform = `custom_${sourceId}`;

    // Get old entry for recalc of old date/country
    const oldEntry = await pool.query(
      'SELECT id, date, country_code FROM campaign_metrics WHERE id = $1 AND user_id = $2 AND platform = $3',
      [entryId, dataOwnerId, platform]
    );
    if (oldEntry.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const oldDate = String(oldEntry.rows[0].date).slice(0, 10);
    const oldCountry = oldEntry.rows[0].country_code;

    // Build update
    const allowed = { spend: parseFloat, impressions: parseInt, clicks: parseInt, revenue: parseFloat, purchases: parseInt };
    const sets = [];
    const values = [];
    let paramIdx = 1;

    if (date !== undefined) {
      sets.push(`date = $${paramIdx}`);
      values.push(String(date).slice(0, 10));
      paramIdx++;
    }
    if (campaign !== undefined) {
      sets.push(`campaign_id = $${paramIdx}`);
      values.push((campaign || '').trim());
      paramIdx++;
    }
    if (country !== undefined) {
      sets.push(`country_code = $${paramIdx}`);
      values.push((country || '').trim());
      paramIdx++;
    }
    for (const [key, parser] of Object.entries(allowed)) {
      if (req.body[key] !== undefined) {
        sets.push(`${key} = $${paramIdx}`);
        values.push(parser(req.body[key]) || 0);
        paramIdx++;
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(entryId, dataOwnerId, platform);
    await pool.query(
      `UPDATE campaign_metrics SET ${sets.join(', ')} WHERE id = $${paramIdx} AND user_id = $${paramIdx + 1} AND platform = $${paramIdx + 2}`,
      values
    );

    // Recalc metrics_cache for old and new date/country combos
    await recalcMetricsCache(dataOwnerId, platform, oldDate, oldCountry);
    const newDate = date !== undefined ? String(date).slice(0, 10) : oldDate;
    const newCountry = country !== undefined ? (country || '').trim() : oldCountry;
    if (newDate !== oldDate || newCountry !== oldCountry) {
      await recalcMetricsCache(dataOwnerId, platform, newDate, newCountry);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Update custom source entry error:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
}

// DELETE /api/custom-sources/:id/entries/:entryId
async function deleteEntry(req, res) {
  const { userId } = req.query;
  const { id: sourceId, entryId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const platform = `custom_${sourceId}`;

    // Get entry for recalc
    const entry = await pool.query(
      'SELECT id, date, country_code FROM campaign_metrics WHERE id = $1 AND user_id = $2 AND platform = $3',
      [entryId, dataOwnerId, platform]
    );
    if (entry.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const dateStr = String(entry.rows[0].date).slice(0, 10);
    const countryCode = entry.rows[0].country_code;

    await pool.query(
      'DELETE FROM campaign_metrics WHERE id = $1 AND user_id = $2 AND platform = $3',
      [entryId, dataOwnerId, platform]
    );

    // Recalc metrics_cache
    await recalcMetricsCache(dataOwnerId, platform, dateStr, countryCode);

    res.json({ ok: true });
  } catch (error) {
    console.error('Delete custom source entry error:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
}

/**
 * Recalculate metrics_cache for a given platform+date+country by summing campaign_metrics.
 * If no campaign_metrics rows exist, delete the metrics_cache row.
 */
async function recalcMetricsCache(userId, platform, date, countryCode) {
  const agg = await pool.query(
    `SELECT COALESCE(SUM(spend), 0) as spend, COALESCE(SUM(impressions), 0) as impressions,
            COALESCE(SUM(clicks), 0) as clicks, COALESCE(SUM(revenue), 0) as revenue,
            COALESCE(SUM(purchases), 0) as purchases, COUNT(*) as cnt
     FROM campaign_metrics
     WHERE user_id = $1 AND platform = $2 AND date = $3 AND country_code = $4`,
    [userId, platform, date, countryCode]
  );

  const row = agg.rows[0];
  if (parseInt(row.cnt) === 0) {
    await pool.query(
      'DELETE FROM metrics_cache WHERE user_id = $1 AND platform = $2 AND date = $3 AND country_code = $4',
      [userId, platform, date, countryCode]
    );
  } else {
    await pool.query(
      `INSERT INTO metrics_cache (user_id, country_code, date, platform, spend, impressions, clicks, revenue, purchases)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id, country_code, date, platform) DO UPDATE
         SET spend = $5, impressions = $6, clicks = $7, revenue = $8, purchases = $9, cached_at = NOW()`,
      [userId, countryCode, date, platform,
       parseFloat(row.spend), parseInt(row.impressions), parseInt(row.clicks),
       parseFloat(row.revenue), parseInt(row.purchases)]
    );
  }
}

module.exports = { createSource, listSources, updateSource, deleteSource, listEntries, createEntry, updateEntry, deleteEntry };
