const { pool } = require('../db/database');
const { getOrCreateUserByClerkId } = require('./auth');
const { resolveDataOwner } = require('../services/team');

/** Safely format a date from pg (could be Date object or string) to YYYY-MM-DD */
function fmtDate(d) {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

// POST /api/custom-sources
async function createSource(req, res) {
  const { userId, name, track_impressions, track_clicks, track_conversions, track_revenue, icon } = req.body || {};

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
      `INSERT INTO custom_sources (user_id, name, track_impressions, track_clicks, track_conversions, track_revenue, icon)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [dataOwnerId, name.trim(), !!track_impressions, !!track_clicks, !!track_conversions, !!track_revenue, icon || null]
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

    const allowed = ['name', 'track_impressions', 'track_clicks', 'track_conversions', 'track_revenue', 'icon'];
    const sets = [];
    const values = [];
    let paramIdx = 1;

    for (const key of allowed) {
      if (key in fields) {
        sets.push(`${key} = $${paramIdx}`);
        values.push(key === 'name' ? (fields[key] || '').trim() : key === 'icon' ? (fields[key] || null) : !!fields[key]);
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

// GET /api/custom-sources/:id/entries?userId=X&page=&limit=&date=YYYY-MM-DD&campaign=X
async function listEntries(req, res) {
  const { userId, page = '1', limit = '20', date, campaign } = req.query;
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

    // Optional filters
    const baseParams = [dataOwnerId, platform];
    const filters = [];
    const filterParams = [];
    let paramIdx = 3;

    if (date) {
      filters.push(`date = $${paramIdx}`);
      filterParams.push(String(date).slice(0, 10));
      paramIdx++;
    }
    if (campaign) {
      filters.push(`campaign_id = $${paramIdx}`);
      filterParams.push(String(campaign));
      paramIdx++;
    }

    const whereExtra = filters.length ? ' AND ' + filters.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM campaign_metrics WHERE user_id = $1 AND platform = $2${whereExtra}`,
      [...baseParams, ...filterParams]
    );

    const dataResult = await pool.query(
      `SELECT id, campaign_id, country_code, date, spend, impressions, clicks, revenue, purchases
       FROM campaign_metrics WHERE user_id = $1 AND platform = $2${whereExtra}
       ORDER BY date DESC, campaign_id ASC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...baseParams, ...filterParams, lim, offset]
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

    const oldDate = fmtDate(oldEntry.rows[0].date);
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

    const dateStr = fmtDate(entry.rows[0].date);
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

// GET /api/custom-sources/:id/campaigns?userId=X
async function listCampaigns(req, res) {
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

    const source = await pool.query(
      'SELECT id FROM custom_sources WHERE id = $1 AND user_id = $2',
      [sourceId, dataOwnerId]
    );
    if (source.rows.length === 0) {
      return res.status(404).json({ error: 'Custom source not found' });
    }

    const platform = `custom_${sourceId}`;

    const result = await pool.query(
      `SELECT cm.campaign_id,
              COALESCE(SUM(cm.spend), 0) as total_spend,
              COALESCE(SUM(cm.impressions), 0) as total_impressions,
              COALESCE(SUM(cm.clicks), 0) as total_clicks,
              COALESCE(SUM(cm.revenue), 0) as total_revenue,
              COALESCE(SUM(cm.purchases), 0) as total_purchases,
              COUNT(*) as entry_count,
              MIN(cm.date) as first_date,
              MAX(cm.date) as last_date,
              COALESCE(cs.country_attribution, 'none') as country_attribution,
              COALESCE(cs.country_code, '') as attributed_country_code
       FROM campaign_metrics cm
       LEFT JOIN campaign_settings cs
         ON cs.user_id = cm.user_id AND cs.platform = cm.platform AND cs.campaign_id = cm.campaign_id
       WHERE cm.user_id = $1 AND cm.platform = $2
       GROUP BY cm.campaign_id, cs.country_attribution, cs.country_code
       ORDER BY cm.campaign_id ASC`,
      [dataOwnerId, platform]
    );

    res.json({ campaigns: result.rows });
  } catch (error) {
    console.error('List campaigns error:', error);
    res.status(500).json({ error: 'Failed to list campaigns' });
  }
}

// PUT /api/custom-sources/:id/campaigns/:campaignId/settings
async function updateCampaignSettings(req, res) {
  const { userId, country_attribution, country_code } = req.body || {};
  const sourceId = req.params.id;
  const campaignId = decodeURIComponent(req.params.campaignId);

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  if (!['none', 'single', 'multiple'].includes(country_attribution)) {
    return res.status(400).json({ error: 'country_attribution must be none, single, or multiple' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const source = await pool.query(
      'SELECT id FROM custom_sources WHERE id = $1 AND user_id = $2',
      [sourceId, dataOwnerId]
    );
    if (source.rows.length === 0) {
      return res.status(404).json({ error: 'Custom source not found' });
    }

    const platform = `custom_${sourceId}`;
    const cc = country_attribution === 'single' ? (country_code || '').toUpperCase().slice(0, 2) : '';

    // UPSERT campaign_settings
    await pool.query(
      `INSERT INTO campaign_settings (user_id, platform, campaign_id, country_attribution, country_code)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, platform, campaign_id) DO UPDATE
         SET country_attribution = $4, country_code = $5`,
      [dataOwnerId, platform, campaignId, country_attribution, cc]
    );

    // Recalc metrics_cache for all dates of this campaign
    const dates = await pool.query(
      `SELECT DISTINCT to_char(date, 'YYYY-MM-DD') as date_str FROM campaign_metrics WHERE user_id = $1 AND platform = $2 AND campaign_id = $3`,
      [dataOwnerId, platform, campaignId]
    );
    const recalcDates = dates.rows.map(r => r.date_str);
    for (const d of recalcDates) {
      await recalcMetricsCacheForDate(dataOwnerId, platform, d);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Update campaign settings error:', error);
    res.status(500).json({ error: error.message || 'Failed to update campaign settings' });
  }
}

/**
 * Recalculate metrics_cache for a given platform+date+country by summing campaign_metrics.
 * If no campaign_metrics rows exist, delete the metrics_cache row.
 * For custom sources, this is a simple per-country aggregation (non-attributed).
 */
async function recalcMetricsCache(userId, platform, date, countryCode) {
  // For custom sources, use the attribution-aware recalc for the whole date
  if (platform.startsWith('custom_')) {
    return recalcMetricsCacheForDate(userId, platform, date);
  }

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

/**
 * Attribution-aware recalc for custom sources.
 * Spend/impressions/clicks go to the attributed country (from campaign_settings).
 * Revenue/purchases stay with the entry's original country_code.
 * Replaces ALL metrics_cache rows for this platform+date with fresh aggregation.
 */
async function recalcMetricsCacheForDate(userId, platform, date) {
  // Pass 1: spend/impressions/clicks → attributed country
  const spendAgg = await pool.query(
    `SELECT
       CASE
         WHEN cs.country_attribution = 'single' AND cs.country_code != '' THEN cs.country_code
         ELSE cm.country_code
       END as effective_country,
       COALESCE(SUM(cm.spend), 0) as spend,
       COALESCE(SUM(cm.impressions), 0) as impressions,
       COALESCE(SUM(cm.clicks), 0) as clicks
     FROM campaign_metrics cm
     LEFT JOIN campaign_settings cs
       ON cs.user_id = cm.user_id AND cs.platform = cm.platform AND cs.campaign_id = cm.campaign_id
     WHERE cm.user_id = $1 AND cm.platform = $2 AND cm.date = $3
     GROUP BY effective_country`,
    [userId, platform, date]
  );

  // Pass 2: revenue/purchases → original country_code
  const revAgg = await pool.query(
    `SELECT country_code,
       COALESCE(SUM(revenue), 0) as revenue,
       COALESCE(SUM(purchases), 0) as purchases
     FROM campaign_metrics
     WHERE user_id = $1 AND platform = $2 AND date = $3
     GROUP BY country_code`,
    [userId, platform, date]
  );

  // Merge into a single map by country
  const countryMap = {};
  for (const row of spendAgg.rows) {
    const cc = row.effective_country || '';
    if (!countryMap[cc]) countryMap[cc] = { spend: 0, impressions: 0, clicks: 0, revenue: 0, purchases: 0 };
    countryMap[cc].spend += parseFloat(row.spend);
    countryMap[cc].impressions += parseInt(row.impressions);
    countryMap[cc].clicks += parseInt(row.clicks);
  }
  for (const row of revAgg.rows) {
    const cc = row.country_code || '';
    if (!countryMap[cc]) countryMap[cc] = { spend: 0, impressions: 0, clicks: 0, revenue: 0, purchases: 0 };
    countryMap[cc].revenue += parseFloat(row.revenue);
    countryMap[cc].purchases += parseInt(row.purchases);
  }

  // Delete old metrics_cache rows for this platform+date
  await pool.query(
    'DELETE FROM metrics_cache WHERE user_id = $1 AND platform = $2 AND date = $3',
    [userId, platform, date]
  );

  // Insert new rows
  for (const [cc, data] of Object.entries(countryMap)) {
    if (data.spend === 0 && data.impressions === 0 && data.clicks === 0 && data.revenue === 0 && data.purchases === 0) continue;
    await pool.query(
      `INSERT INTO metrics_cache (user_id, country_code, date, platform, spend, impressions, clicks, revenue, purchases)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id, country_code, date, platform) DO UPDATE
         SET spend = $5, impressions = $6, clicks = $7, revenue = $8, purchases = $9, cached_at = NOW()`,
      [userId, cc, date, platform, data.spend, data.impressions, data.clicks, data.revenue, data.purchases]
    );
  }
}

module.exports = {
  createSource, listSources, updateSource, deleteSource,
  listEntries, createEntry, updateEntry, deleteEntry,
  listCampaigns, updateCampaignSettings,
};
