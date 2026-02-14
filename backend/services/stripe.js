const axios = require('axios');

const STRIPE_API = 'https://api.stripe.com/v1';

/**
 * Fetch revenue data from Stripe Charges API.
 * Uses expand[]=data.customer to get customer metadata (UTM campaign attribution).
 * Each charge returns its own currency — Stripe accounts can process multiple currencies.
 *
 * @param {string} apiKey - Stripe restricted/secret key (rk_live_... or sk_live_...)
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Array<{ country: string, date: string, revenue: number, purchases: number, campaign: string, currency: string }>}
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

      // Stripe amounts are in the smallest currency unit (e.g. cents for USD/EUR, yen for JPY)
      const chargeCurrency = (charge.currency || 'usd').toUpperCase();
      const isZeroDecimal = ['BIF','CLP','DJF','GNF','JPY','KMF','KRW','MGA','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF'].includes(chargeCurrency);
      const revenue = isZeroDecimal ? charge.amount : charge.amount / 100;

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
        currency: chargeCurrency,
      });
    }

    if (charges.length === 0) break;
  }

  return results;
}

module.exports = { fetchRevenueData };
