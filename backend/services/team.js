const { pool } = require('../db/database');
const { getUserSubscription } = require('./subscription');

/**
 * Resolve the data owner for a given user.
 * - If the user is an accepted team member, returns the team owner's userId
 *   (after verifying the owner still has an active Pro subscription with teamAccess).
 * - Returns null if the owner has downgraded (caller should return 403).
 * - Returns the user's own ID if they're not a team member.
 */
async function resolveDataOwner(internalUserId) {
  // Check if user is an accepted member of any team
  const memberResult = await pool.query(
    `SELECT t.owner_user_id
     FROM team_members tm
     JOIN teams t ON t.id = tm.team_id
     WHERE tm.user_id = $1 AND tm.status = 'accepted'
     LIMIT 1`,
    [internalUserId]
  );

  if (memberResult.rows.length === 0) {
    // Not a team member — use own data
    return internalUserId;
  }

  const ownerUserId = memberResult.rows[0].owner_user_id;

  // Verify owner still has active Pro with teamAccess
  const ownerSub = await getUserSubscription(ownerUserId);
  if (!ownerSub.isActive || !ownerSub.limits.teamAccess) {
    return null; // Owner downgraded — block access
  }

  return ownerUserId;
}

module.exports = { resolveDataOwner };
