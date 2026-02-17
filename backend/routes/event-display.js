const { pool } = require('../db/database');
const { getOrCreateUserByClerkId } = require('./auth');
const { resolveDataOwner } = require('../services/team');

// GET /api/event-display/sections?userId=X
async function listSections(req, res) {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) return res.status(403).json({ error: 'Unauthorized' });

    const sectionsResult = await pool.query(
      'SELECT * FROM event_display_sections WHERE user_id = $1 ORDER BY display_order ASC, created_at ASC',
      [dataOwnerId]
    );

    const sections = [];
    for (const section of sectionsResult.rows) {
      const itemsResult = await pool.query(
        'SELECT * FROM event_display_items WHERE section_id = $1 ORDER BY display_order ASC',
        [section.id]
      );
      sections.push({ ...section, items: itemsResult.rows });
    }

    res.json({ sections });
  } catch (error) {
    console.error('List display sections error:', error);
    res.status(500).json({ error: 'Failed to list sections' });
  }
}

// POST /api/event-display/sections
async function createSection(req, res) {
  const { userId, title, section_type, items } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) return res.status(403).json({ error: 'Unauthorized' });

    const orderResult = await pool.query(
      'SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order FROM event_display_sections WHERE user_id = $1',
      [dataOwnerId]
    );

    const result = await pool.query(
      `INSERT INTO event_display_sections (user_id, title, section_type, display_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [dataOwnerId, title || 'Untitled', section_type || 'table', orderResult.rows[0].next_order]
    );

    const section = result.rows[0];

    // Insert items
    if (Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await pool.query(
          `INSERT INTO event_display_items (section_id, event_name, property_name, property_value, display_order, item_type, label, rate_event_name, rate_property_name, rate_property_value)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [section.id, item.event_name, item.property_name || null, item.property_value || null, i,
           item.item_type || 'standard', item.label || null, item.rate_event_name || null, item.rate_property_name || null, item.rate_property_value || null]
        );
      }
    }

    // Fetch back with items
    const itemsResult = await pool.query(
      'SELECT * FROM event_display_items WHERE section_id = $1 ORDER BY display_order ASC',
      [section.id]
    );

    res.json({ ok: true, section: { ...section, items: itemsResult.rows } });
  } catch (error) {
    console.error('Create display section error:', error);
    res.status(500).json({ error: 'Failed to create section' });
  }
}

// PUT /api/event-display/sections/:id
async function updateSection(req, res) {
  const { userId, title, items } = req.body || {};
  const sectionId = req.params.id;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) return res.status(403).json({ error: 'Unauthorized' });

    // Ownership check
    const existing = await pool.query(
      'SELECT id FROM event_display_sections WHERE id = $1 AND user_id = $2',
      [sectionId, dataOwnerId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Section not found' });

    // Update title
    await pool.query(
      'UPDATE event_display_sections SET title = $1, updated_at = NOW() WHERE id = $2',
      [title || 'Untitled', sectionId]
    );

    // Delete + reinsert items
    await pool.query('DELETE FROM event_display_items WHERE section_id = $1', [sectionId]);
    if (Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await pool.query(
          `INSERT INTO event_display_items (section_id, event_name, property_name, property_value, display_order, item_type, label, rate_event_name, rate_property_name, rate_property_value)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [sectionId, item.event_name, item.property_name || null, item.property_value || null, i,
           item.item_type || 'standard', item.label || null, item.rate_event_name || null, item.rate_property_name || null, item.rate_property_value || null]
        );
      }
    }

    // Fetch back
    const section = await pool.query('SELECT * FROM event_display_sections WHERE id = $1', [sectionId]);
    const itemsResult = await pool.query(
      'SELECT * FROM event_display_items WHERE section_id = $1 ORDER BY display_order ASC',
      [sectionId]
    );

    res.json({ ok: true, section: { ...section.rows[0], items: itemsResult.rows } });
  } catch (error) {
    console.error('Update display section error:', error);
    res.status(500).json({ error: 'Failed to update section' });
  }
}

// DELETE /api/event-display/sections/:id
async function deleteSection(req, res) {
  const { userId } = req.query;
  const sectionId = req.params.id;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) return res.status(403).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'DELETE FROM event_display_sections WHERE id = $1 AND user_id = $2 RETURNING id',
      [sectionId, dataOwnerId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Section not found' });

    res.json({ ok: true });
  } catch (error) {
    console.error('Delete display section error:', error);
    res.status(500).json({ error: 'Failed to delete section' });
  }
}

// GET /api/event-display/sections/:id/data?userId=X&startDate=&endDate=
async function getSectionData(req, res) {
  const { userId, startDate, endDate } = req.query;
  const sectionId = req.params.id;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) return res.status(403).json({ error: 'Unauthorized' });

    // Ownership check
    const section = await pool.query(
      'SELECT id FROM event_display_sections WHERE id = $1 AND user_id = $2',
      [sectionId, dataOwnerId]
    );
    if (section.rows.length === 0) return res.status(404).json({ error: 'Section not found' });

    // Get items for this section
    const items = await pool.query(
      'SELECT * FROM event_display_items WHERE section_id = $1 ORDER BY display_order ASC',
      [sectionId]
    );

    // Helper to get count for an event/property/value combo
    async function getCount(eventName, propertyName, propertyValue) {
      let matchQuery = `SELECT id FROM custom_event_sections WHERE user_id = $1 AND event_name = $2`;
      const matchParams = [dataOwnerId, eventName];

      if (propertyName) {
        matchQuery += ` AND group_by_property = $3`;
        matchParams.push(propertyName);
      } else {
        matchQuery += ` AND (group_by_property IS NULL OR group_by_property = '')`;
      }
      matchQuery += ' LIMIT 1';

      const matchResult = await pool.query(matchQuery, matchParams);
      if (matchResult.rows.length === 0) return 0;

      const cacheSection = matchResult.rows[0];
      let countQuery = 'SELECT COALESCE(SUM(count), 0) AS total FROM custom_event_cache WHERE section_id = $1';
      const countParams = [cacheSection.id];

      if (propertyValue) {
        countParams.push(propertyValue);
        countQuery += ` AND property_value = $${countParams.length}`;
      } else {
        countQuery += ` AND property_value = '_total'`;
      }

      if (startDate) {
        countParams.push(startDate);
        countQuery += ` AND date >= $${countParams.length}`;
      }
      if (endDate) {
        countParams.push(endDate);
        countQuery += ` AND date <= $${countParams.length}`;
      }

      const countResult = await pool.query(countQuery, countParams);
      return parseInt(countResult.rows[0].total);
    }

    const results = [];
    for (const item of items.rows) {
      const count = await getCount(item.event_name, item.property_name, item.property_value);
      const result = { ...item, count };

      // For rate-type items, also compute the denominator count
      if (item.item_type === 'rate' && item.rate_event_name) {
        result.rate_count = await getCount(item.rate_event_name, item.rate_property_name, item.rate_property_value);
      }

      // For cost_per items, fetch total ad spend or revenue for the date range
      // rate_event_name stores the source: 'revenue' uses revenue, anything else uses ad spend
      if (item.item_type === 'cost_per') {
        const useRevenue = item.rate_event_name === 'revenue';
        const column = useRevenue ? 'revenue' : 'spend';
        let sumQuery = `SELECT COALESCE(SUM(${column}), 0) AS total FROM metrics_cache WHERE user_id = $1`;
        const sumParams = [dataOwnerId];
        if (startDate) {
          sumParams.push(startDate);
          sumQuery += ` AND date >= $${sumParams.length}`;
        }
        if (endDate) {
          sumParams.push(endDate);
          sumQuery += ` AND date <= $${sumParams.length}`;
        }
        const sumResult = await pool.query(sumQuery, sumParams);
        result.total_spend = parseFloat(sumResult.rows[0].total);
        result.cost_per_source = useRevenue ? 'revenue' : 'ad_spend';
      }

      results.push(result);
    }

    res.json({ data: results });
  } catch (error) {
    console.error('Get display section data error:', error);
    res.status(500).json({ error: 'Failed to get section data' });
  }
}

// POST /api/event-display/sections/:id/duplicate
async function duplicateSection(req, res) {
  const { userId, section_type } = req.body || {};
  const sectionId = req.params.id;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) return res.status(403).json({ error: 'Unauthorized' });

    // Ownership check + fetch source section
    const existing = await pool.query(
      'SELECT * FROM event_display_sections WHERE id = $1 AND user_id = $2',
      [sectionId, dataOwnerId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Section not found' });

    const source = existing.rows[0];

    // Next display_order
    const orderResult = await pool.query(
      'SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order FROM event_display_sections WHERE user_id = $1',
      [dataOwnerId]
    );

    // Create duplicate section
    const newType = section_type || source.section_type;
    const result = await pool.query(
      `INSERT INTO event_display_sections (user_id, title, section_type, display_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [dataOwnerId, `Copy of ${source.title}`, newType, orderResult.rows[0].next_order]
    );
    const newSection = result.rows[0];

    // Copy items from source
    const sourceItems = await pool.query(
      'SELECT * FROM event_display_items WHERE section_id = $1 ORDER BY display_order ASC',
      [sectionId]
    );
    for (const item of sourceItems.rows) {
      await pool.query(
        `INSERT INTO event_display_items (section_id, event_name, property_name, property_value, display_order, item_type, label, rate_event_name, rate_property_name, rate_property_value)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [newSection.id, item.event_name, item.property_name, item.property_value, item.display_order,
         item.item_type || 'standard', item.label, item.rate_event_name, item.rate_property_name, item.rate_property_value]
      );
    }

    // Fetch back with items
    const itemsResult = await pool.query(
      'SELECT * FROM event_display_items WHERE section_id = $1 ORDER BY display_order ASC',
      [newSection.id]
    );

    res.json({ ok: true, section: { ...newSection, items: itemsResult.rows } });
  } catch (error) {
    console.error('Duplicate display section error:', error);
    res.status(500).json({ error: 'Failed to duplicate section' });
  }
}

module.exports = { listSections, createSection, updateSection, deleteSection, getSectionData, duplicateSection };
