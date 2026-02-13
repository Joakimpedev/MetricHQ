const { pool } = require('../db/database');
const { getUserSubscription } = require('../services/subscription');
const { getPlanFromPriceId, PLAN_LIMITS } = require('../config/plans');
const { getOrCreateUserByClerkId } = require('./auth');

// Initialize Stripe (only if key is set)
const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

// GET /api/billing/subscription
async function getSubscription(req, res) {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const sub = await getUserSubscription(internalUserId);
    res.json(sub);
  } catch (error) {
    console.error('Billing subscription error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
}

// POST /api/billing/checkout
async function createCheckout(req, res) {
  const { userId, priceId } = req.body || {};
  if (!userId || !priceId) {
    return res.status(400).json({ error: 'userId and priceId are required' });
  }
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const sub = await getUserSubscription(internalUserId);

    // Get or create Stripe customer
    let customerId = sub.stripeCustomerId;
    if (!customerId) {
      // Look up user email
      const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [internalUserId]);
      const email = userResult.rows[0]?.email;

      const customer = await stripe.customers.create({
        metadata: { internalUserId: String(internalUserId), clerkUserId: userId },
        ...(email && !email.includes('@placeholder.local') ? { email } : {}),
      });
      customerId = customer.id;

      await pool.query(
        `UPDATE subscriptions SET stripe_customer_id = $1, updated_at = NOW() WHERE user_id = $2`,
        [customerId, internalUserId]
      );
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Use trial_end (timestamp) instead of trial_period_days
    // so Stripe shows "$0.00 due today" instead of "X days free"
    const isNewSubscriber = !sub.stripeSubscriptionId || sub.status === 'trial' || sub.status === 'cancelled';

    const sessionParams = {
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/dashboard?billing=success`,
      cancel_url: `${frontendUrl}/pricing?billing=cancelled`,
      metadata: { internalUserId: String(internalUserId) },
    };

    if (isNewSubscriber) {
      let trialEndTimestamp;
      if (sub.trialEnd) {
        // Use remaining trial time from DB
        const trialEnd = new Date(sub.trialEnd);
        if (trialEnd > new Date()) {
          trialEndTimestamp = Math.floor(trialEnd.getTime() / 1000);
        }
      } else {
        // Default: 14 days from now
        trialEndTimestamp = Math.floor(Date.now() / 1000) + (14 * 86400);
      }

      if (trialEndTimestamp) {
        sessionParams.subscription_data = { trial_end: trialEndTimestamp };
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    res.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

// POST /api/billing/portal
async function createPortal(req, res) {
  const { userId } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  try {
    const internalUserId = await getOrCreateUserByClerkId(userId);
    const sub = await getUserSubscription(internalUserId);

    if (!sub.stripeCustomerId) {
      return res.status(400).json({ error: 'No billing account found. Please subscribe first.' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${frontendUrl}/settings`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Portal error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
}

// POST /api/billing/webhook (receives raw body)
async function handleWebhook(req, res) {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const subscriptionId = session.subscription;
        const customerId = session.customer;
        const internalUserId = session.metadata?.internalUserId;

        if (subscriptionId && internalUserId) {
          // Fetch the subscription to get the price ID
          const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = stripeSub.items?.data?.[0]?.price?.id;
          const plan = getPlanFromPriceId(priceId) || 'growth';

          await pool.query(
            `UPDATE subscriptions
             SET stripe_customer_id = $1,
                 stripe_subscription_id = $2,
                 stripe_price_id = $3,
                 plan = $4,
                 status = 'active',
                 current_period_end = to_timestamp($5),
                 cancel_at_period_end = false,
                 updated_at = NOW()
             WHERE user_id = $6`,
            [customerId, subscriptionId, priceId, plan,
             stripeSub.current_period_end, parseInt(internalUserId)]
          );
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        if (subscriptionId) {
          const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
          await pool.query(
            `UPDATE subscriptions
             SET status = 'active',
                 current_period_end = to_timestamp($1),
                 updated_at = NOW()
             WHERE stripe_subscription_id = $2`,
            [stripeSub.current_period_end, subscriptionId]
          );
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await pool.query(
            `UPDATE subscriptions
             SET status = 'past_due', updated_at = NOW()
             WHERE stripe_subscription_id = $1`,
            [invoice.subscription]
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const plan = getPlanFromPriceId(priceId);

        const updates = {
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_end: subscription.current_period_end,
          stripe_price_id: priceId,
        };

        if (plan) updates.plan = plan;

        // Map Stripe status to our status
        let status = subscription.status; // active, past_due, canceled, etc.
        if (status === 'canceled') status = 'cancelled';
        if (status === 'trialing') status = 'trialing';

        await pool.query(
          `UPDATE subscriptions
           SET status = $1,
               plan = COALESCE($2, plan),
               stripe_price_id = $3,
               current_period_end = to_timestamp($4),
               cancel_at_period_end = $5,
               updated_at = NOW()
           WHERE stripe_subscription_id = $6`,
          [status, plan, priceId, updates.current_period_end,
           updates.cancel_at_period_end, subscription.id]
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await pool.query(
          `UPDATE subscriptions
           SET status = 'cancelled', updated_at = NOW()
           WHERE stripe_subscription_id = $1`,
          [subscription.id]
        );
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

module.exports = { getSubscription, createCheckout, createPortal, handleWebhook };
