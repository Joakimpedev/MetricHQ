const axios = require('axios');

const STRIPE_API = 'https://api.stripe.com/v1';

/**
 * Fetch revenue data from Stripe Charges API.
 * Uses expand[]=data.customer to get customer metadata (UTM campaign attribution).
 *
 * @param {string} apiKey - Stripe restricted/secret key (rk_live_... or sk_live_...)
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Array<{ country: string, date: string, revenue: number, purchases: number, campaign: string }>}
 */
async function fetchRevenueData(apiKey, startDate, endDate) {
  const startUnix = Math.floor(new Date(startDate + 'T00:00:00Z').getTime() / 1000);
  const endUnix = Math.floor(new Date(endDate + 'T23:59:59Z').getTime() / 1000);

  const results = [];
  let startingAfter = null;
  let hasMore = true;

  while (hasMore) {
    const params = {
      status: 'succeeded',
      'created[gte]': startUnix,
      'created[lt]': endUnix,
      limit: 100,
      'expand[]': 'data.customer',
    };
    if (startingAfter) {
      params.starting_after = startingAfter;
    }

    const response = await axios.get(`${STRIPE_API}/charges`, {
      params,
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 30000,
    });

    const charges = response.data.data || [];
    hasMore = response.data.has_more;

    for (const charge of charges) {
      startingAfter = charge.id;

      const revenue = charge.amount / 100; // cents to dollars
      const country = charge.billing_details?.address?.country
        || charge.payment_method_details?.card?.country
        || '';
      const date = new Date(charge.created * 1000).toISOString().slice(0, 10);
      const campaign = charge.customer?.metadata?.utm_campaign || '';

      results.push({
        country: (country || '').toUpperCase().slice(0, 2),
        date,
        revenue,
        purchases: 1,
        campaign,
      });
    }

    if (charges.length === 0) break;
  }

  return results;
}

module.exports = { fetchRevenueData };
