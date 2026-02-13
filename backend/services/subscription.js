const { pool } = require('../db/database');
const { PLAN_LIMITS } = require('../config/plans');

/**
 * Get a user's subscription status. Performs lazy trial expiry check.
 * Returns { plan, status, isActive, limits, trialEnd, currentPeriodEnd, cancelAtPeriodEnd }
 */
async function getUserSubscription(userId) {
  const result = await pool.query(
    'SELECT * FROM subscriptions WHERE user_id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    return {
      plan: null,
      status: 'none',
      isActive: false,
      limits: PLAN_LIMITS.starter,
      trialEnd: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  const sub = result.rows[0];

  // Lazy trial expiry: if trialing and trial_end has passed, mark expired
  if (sub.status === 'trialing' && sub.trial_end && new Date(sub.trial_end) < new Date()) {
    await pool.query(
      `UPDATE subscriptions SET status = 'expired', updated_at = NOW()
       WHERE user_id = $1 AND status = 'trialing'`,
      [userId]
    );
    sub.status = 'expired';
  }

  const isActive = ['trialing', 'active'].includes(sub.status);
  const plan = isActive ? sub.plan : null;
  const limits = PLAN_LIMITS[sub.plan] || PLAN_LIMITS.starter;

  return {
    plan: sub.plan,
    status: sub.status,
    isActive,
    limits: isActive ? limits : PLAN_LIMITS.starter,
    trialEnd: sub.trial_end,
    currentPeriodEnd: sub.current_period_end,
    cancelAtPeriodEnd: sub.cancel_at_period_end || false,
    stripeCustomerId: sub.stripe_customer_id,
    stripeSubscriptionId: sub.stripe_subscription_id,
  };
}

module.exports = { getUserSubscription };
