const PLAN_LIMITS = {
  starter: {
    maxAdPlatforms: 1,
    syncIntervalHours: 24,
    dataRetentionDays: 30,
    campaignPL: false,
  },
  growth: {
    maxAdPlatforms: Infinity,
    syncIntervalHours: 4,
    dataRetentionDays: 90,
    campaignPL: true,
  },
  pro: {
    maxAdPlatforms: Infinity,
    syncIntervalHours: 4,
    dataRetentionDays: Infinity,
    campaignPL: true,
  },
};

// Map Stripe price IDs to plan names (set via env vars)
const PRICE_TO_PLAN = {};
const priceEnvMap = {
  STRIPE_PRICE_STARTER_MONTHLY: 'starter',
  STRIPE_PRICE_STARTER_YEARLY: 'starter',
  STRIPE_PRICE_GROWTH_MONTHLY: 'growth',
  STRIPE_PRICE_GROWTH_YEARLY: 'growth',
  STRIPE_PRICE_PRO_MONTHLY: 'pro',
  STRIPE_PRICE_PRO_YEARLY: 'pro',
};

for (const [envKey, plan] of Object.entries(priceEnvMap)) {
  const priceId = process.env[envKey];
  if (priceId) {
    PRICE_TO_PLAN[priceId] = plan;
  }
}

function getPlanFromPriceId(priceId) {
  return PRICE_TO_PLAN[priceId] || null;
}

module.exports = { PLAN_LIMITS, PRICE_TO_PLAN, getPlanFromPriceId };
