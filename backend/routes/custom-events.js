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

module.exports = { createSection, listSections, updateSection, deleteSection, getSectionData, getEventProperties };
