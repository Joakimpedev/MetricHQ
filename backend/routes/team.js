const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { pool } = require('../db/database');
const { getOrCreateUserByClerkId } = require('./auth');
const { getUserSubscription } = require('../services/subscription');

// POST /api/team/invite — Owner sends invite
router.post('/invite', async (req, res) => {
  const { userId, email } = req.body || {};
  if (!userId || !email) {
    return res.status(400).json({ error: 'userId and email are required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);

    // Check Pro subscription with teamAccess
    const sub = await getUserSubscription(internalUserId);
    if (!sub.isActive || !sub.limits.teamAccess) {
      return res.status(403).json({ error: 'Team access requires an active Pro plan' });
    }

    // Get or create team for this owner
    let teamResult = await pool.query(
      'SELECT id FROM teams WHERE owner_user_id = $1',
      [internalUserId]
    );
    if (teamResult.rows.length === 0) {
      teamResult = await pool.query(
        'INSERT INTO teams (owner_user_id) VALUES ($1) RETURNING id',
        [internalUserId]
      );
    }
    const teamId = teamResult.rows[0].id;

    // Check if already invited
    const existing = await pool.query(
      'SELECT id, status FROM team_members WHERE team_id = $1 AND email = $2',
      [teamId, email.trim().toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'This email has already been invited' });
    }

    // Generate invite token
    const token = crypto.randomBytes(32).toString('hex');

    await pool.query(
      `INSERT INTO team_members (team_id, email, invite_token, status)
       VALUES ($1, $2, $3, 'pending')`,
      [teamId, email.trim().toLowerCase(), token]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteLink = `${frontendUrl}/invite?token=${token}`;

    res.json({ ok: true, inviteLink });
  } catch (error) {
    console.error('Team invite error:', error);
    res.status(500).json({ error: 'Failed to send invite' });
  }
});

// POST /api/team/accept — Invited user accepts
router.post('/accept', async (req, res) => {
  const { userId, token } = req.body || {};
  if (!userId || !token) {
    return res.status(400).json({ error: 'userId and token are required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);

    // Find pending invite by token
    const invite = await pool.query(
      `SELECT tm.id, tm.team_id, t.owner_user_id
       FROM team_members tm
       JOIN teams t ON t.id = tm.team_id
       WHERE tm.invite_token = $1 AND tm.status = 'pending'`,
      [token]
    );

    if (invite.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired invite' });
    }

    const { id: memberId, owner_user_id } = invite.rows[0];

    // Don't let the owner accept their own invite
    if (owner_user_id === internalUserId) {
      return res.status(400).json({ error: 'You cannot join your own team' });
    }

    // Accept the invite
    await pool.query(
      `UPDATE team_members
       SET user_id = $1, status = 'accepted', invite_token = NULL, accepted_at = NOW()
       WHERE id = $2`,
      [internalUserId, memberId]
    );

    res.json({ ok: true, message: 'Invite accepted' });
  } catch (error) {
    console.error('Team accept error:', error);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
});

// GET /api/team — List members for the owner's team
router.get('/', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);

    const team = await pool.query(
      'SELECT id FROM teams WHERE owner_user_id = $1',
      [internalUserId]
    );

    if (team.rows.length === 0) {
      return res.json({ members: [] });
    }

    const members = await pool.query(
      `SELECT tm.id, tm.email, tm.status, tm.invited_at, tm.accepted_at
       FROM team_members tm
       WHERE tm.team_id = $1
       ORDER BY tm.invited_at DESC`,
      [team.rows[0].id]
    );

    res.json({ members: members.rows });
  } catch (error) {
    console.error('Team list error:', error);
    res.status(500).json({ error: 'Failed to list team members' });
  }
});

// DELETE /api/team/members/:id — Owner removes member
router.delete('/members/:id', async (req, res) => {
  const { userId } = req.query;
  const memberId = req.params.id;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);

    // Verify ownership via JOIN
    const result = await pool.query(
      `DELETE FROM team_members tm
       USING teams t
       WHERE tm.id = $1 AND tm.team_id = t.id AND t.owner_user_id = $2
       RETURNING tm.id`,
      [memberId, internalUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found or not authorized' });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Team remove error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

module.exports = router;
