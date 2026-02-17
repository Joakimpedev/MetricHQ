const { pool } = require('../db/database');
const { getOrCreateUserByClerkId } = require('./auth');
const { resolveDataOwner } = require('../services/team');
const { fetchEventCounts, fetchEventProperties } = require('../services/posthog');

// POST /api/custom-events/sections
async function createSection(req, res) {
  const { userId, event_name, title, group_by_property } = req.body || {};

  if (!userId || !event_name) {
    return res.status(400).json({ error: 'userId and event_name are required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get next display_order
    const orderResult = await pool.query(
      'SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order FROM custom_event_sections WHERE user_id = $1',
      [dataOwnerId]
    );
    const displayOrder = orderResult.rows[0].next_order;

    const result = await pool.query(
      `INSERT INTO custom_event_sections (user_id, event_name, title, group_by_property, display_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [dataOwnerId, event_name.trim(), title?.trim() || null, group_by_property?.trim() || null, displayOrder]
    );

    const section = result.rows[0];

    // Trigger immediate sync for this section
    try {
      const { syncCustomEventSection } = require('../services/sync');
      syncCustomEventSection(dataOwnerId, section.id).catch(err => {
        console.error(`[custom-events] Immediate sync failed for section ${section.id}:`, err.message);
      });
    } catch (err) {
      console.error('[custom-events] Could not trigger immediate sync:', err.message);
    }

    res.json({ ok: true, section });
  } catch (error) {
    console.error('Create custom event section error:', error);
    res.status(500).json({ error: 'Failed to create section' });
  }
}

// GET /api/custom-events/sections?userId=X
async function listSections(req, res) {
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
      'SELECT * FROM custom_event_sections WHERE user_id = $1 ORDER BY display_order ASC, created_at ASC',
      [dataOwnerId]
    );

    res.json({ sections: result.rows });
  } catch (error) {
    console.error('List custom event sections error:', error);
    res.status(500).json({ error: 'Failed to list sections' });
  }
}

// PUT /api/custom-events/sections/:id
async function updateSection(req, res) {
  const { userId, ...fields } = req.body || {};
  const sectionId = req.params.id;
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
      'SELECT * FROM custom_event_sections WHERE id = $1 AND user_id = $2',
      [sectionId, dataOwnerId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const old = existing.rows[0];
    const eventChanged = fields.event_name && fields.event_name !== old.event_name;
    const propertyChanged = 'group_by_property' in fields && fields.group_by_property !== old.group_by_property;

    // Build dynamic update
    const allowed = ['event_name', 'title', 'group_by_property', 'display_order'];
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
    values.push(sectionId, dataOwnerId);

    const result = await pool.query(
      `UPDATE custom_event_sections SET ${sets.join(', ')} WHERE id = $${paramIdx} AND user_id = $${paramIdx + 1} RETURNING *`,
      values
    );

    // Clear cache if event or property changed
    if (eventChanged || propertyChanged) {
      await pool.query('DELETE FROM custom_event_cache WHERE section_id = $1', [sectionId]);

      // Trigger re-sync
      try {
        const { syncCustomEventSection } = require('../services/sync');
        syncCustomEventSection(dataOwnerId, parseInt(sectionId)).catch(err => {
          console.error(`[custom-events] Re-sync failed for section ${sectionId}:`, err.message);
        });
      } catch (err) {
        console.error('[custom-events] Could not trigger re-sync:', err.message);
      }
    }

    res.json({ ok: true, section: result.rows[0] });
  } catch (error) {
    console.error('Update custom event section error:', error);
    res.status(500).json({ error: 'Failed to update section' });
  }
}

// DELETE /api/custom-events/sections/:id
async function deleteSection(req, res) {
  const { userId } = req.query;
  const sectionId = req.params.id;
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
      'DELETE FROM custom_event_sections WHERE id = $1 AND user_id = $2 RETURNING id',
      [sectionId, dataOwnerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Delete custom event section error:', error);
    res.status(500).json({ error: 'Failed to delete section' });
  }
}

// GET /api/custom-events/sections/:id/data?userId=X&startDate=&endDate=
async function getSectionData(req, res) {
  const { userId, startDate, endDate } = req.query;
  const sectionId = req.params.id;
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
    const section = await pool.query(
      'SELECT id FROM custom_event_sections WHERE id = $1 AND user_id = $2',
      [sectionId, dataOwnerId]
    );
    if (section.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    let query = 'SELECT date, property_value, count FROM custom_event_cache WHERE section_id = $1';
    const params = [sectionId];

    if (startDate) {
      params.push(startDate);
      query += ` AND date >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND date <= $${params.length}`;
    }

    query += ' ORDER BY date ASC, property_value ASC';

    const result = await pool.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Get section data error:', error);
    res.status(500).json({ error: 'Failed to get section data' });
  }
}

// GET /api/custom-events/properties?userId=X&eventName=Y
async function getEventProperties(req, res) {
  const { userId, eventName } = req.query;
  if (!userId || !eventName) {
    return res.status(400).json({ error: 'userId and eventName are required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get PostHog credentials
    const account = await pool.query(
      `SELECT access_token, account_id, COALESCE(settings, '{}'::jsonb) as settings
       FROM connected_accounts WHERE user_id = $1 AND platform = 'posthog'`,
      [dataOwnerId]
    );

    if (account.rows.length === 0) {
      return res.status(400).json({ error: 'PostHog not connected' });
    }

    const { access_token, account_id, settings } = account.rows[0];
    const properties = await fetchEventProperties(access_token, account_id, eventName, {
      posthogHost: settings.posthogHost
    });

    res.json({ properties });
  } catch (error) {
    console.error('Get event properties error:', error);
    res.status(500).json({ error: 'Failed to get event properties' });
  }
}

// POST /api/custom-events/sync?userId=X
async function syncAllSections(req, res) {
  const { userId } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { syncCustomEvents } = require('../services/sync');
    await syncCustomEvents(dataOwnerId);

    res.json({ ok: true });
  } catch (error) {
    console.error('Sync custom events error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
}

// GET /api/custom-events/raw-data?userId=X
async function getRawData(req, res) {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) return res.status(403).json({ error: 'Unauthorized' });

    // Get all sections for this user with their cache data
    const sections = await pool.query(
      'SELECT * FROM custom_event_sections WHERE user_id = $1 ORDER BY event_name ASC',
      [dataOwnerId]
    );

    const events = {};
    for (const section of sections.rows) {
      const cache = await pool.query(
        `SELECT property_value, SUM(count) AS total
         FROM custom_event_cache WHERE section_id = $1
         GROUP BY property_value ORDER BY total DESC`,
        [section.id]
      );

      // Skip sections with no cached data
      if (cache.rows.length === 0) continue;

      const eventKey = section.event_name;
      if (!events[eventKey]) {
        events[eventKey] = { event_name: eventKey, properties: {} };
      }

      const propKey = section.group_by_property || '_none';
      if (!events[eventKey].properties[propKey]) {
        events[eventKey].properties[propKey] = [];
      }

      for (const row of cache.rows) {
        events[eventKey].properties[propKey].push({
          value: row.property_value,
          count: parseInt(row.total),
        });
      }
    }

    res.json({ events: Object.values(events) });
  } catch (error) {
    console.error('Get raw data error:', error);
    res.status(500).json({ error: 'Failed to get raw data' });
  }
}

// GET /api/custom-events/values?userId=X&eventName=Y&propertyName=Z
async function getPropertyValues(req, res) {
  const { userId, eventName, propertyName } = req.query;
  if (!userId || !eventName || !propertyName) {
    return res.status(400).json({ error: 'userId, eventName, and propertyName are required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) return res.status(403).json({ error: 'Unauthorized' });

    // Find the matching section
    const section = await pool.query(
      `SELECT id FROM custom_event_sections
       WHERE user_id = $1 AND event_name = $2 AND group_by_property = $3 LIMIT 1`,
      [dataOwnerId, eventName, propertyName]
    );

    if (section.rows.length === 0) {
      return res.json({ values: [] });
    }

    // Get distinct property values from cache (excluding _total)
    const result = await pool.query(
      `SELECT DISTINCT property_value FROM custom_event_cache
       WHERE section_id = $1 AND property_value != '_total'
       ORDER BY property_value ASC`,
      [section.rows[0].id]
    );

    res.json({ values: result.rows.map(r => r.property_value) });
  } catch (error) {
    console.error('Get property values error:', error);
    res.status(500).json({ error: 'Failed to get property values' });
  }
}

// DELETE /api/custom-events/all?userId=X — nuke all event trackers + display sections + cache
async function deleteAll(req, res) {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const dataOwnerId = await resolveDataOwner(internalUserId);
    if (dataOwnerId === null) return res.status(403).json({ error: 'Unauthorized' });

    // Cascade deletes handle custom_event_cache and event_display_items
    await pool.query('DELETE FROM event_display_sections WHERE user_id = $1', [dataOwnerId]);
    await pool.query('DELETE FROM custom_event_sections WHERE user_id = $1', [dataOwnerId]);

    res.json({ ok: true });
  } catch (error) {
    console.error('Delete all custom events error:', error);
    res.status(500).json({ error: 'Failed to delete all' });
  }
}

module.exports = { createSection, listSections, updateSection, deleteSection, getSectionData, getEventProperties, syncAllSections, getRawData, getPropertyValues, deleteAll };
