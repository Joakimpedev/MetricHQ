const axios = require('axios');
const { pool } = require('../db/database');
const { convertToUSD } = require('./exchange-rates');

const RC_API_V2 = 'https://api.revenuecat.com/v2';

/**
 * Extract just the project ID if user pasted a full URL or path.
 * Accepts: "proj1a2b3c4d", "https://app.revenuecat.com/.../proj1a2b3c4d", etc.
 */
function cleanProjectId(raw) {
  let id = String(raw || '').trim();
  // Strip full URLs — extract last path segment that looks like a project ID
  if (id.includes('/')) {
    const parts = id.replace(/\/+$/, '').split('/');
    id = parts[parts.length - 1];
  }
  // Strip any protocol/URL remnants
  id = id.replace(/^https?:?\/?\/?/, '').trim();
  return id;
}

/**
 * Fetch all customers from RevenueCat API v2 (paginated).
 * @param {string} apiKey - RevenueCat secret key (sk_...)
 * @param {string} projectId - RevenueCat project ID
 * @returns {AsyncGenerator<object>} Yields customer objects
 */
async function* fetchAllCustomers(apiKey, projectId) {
  const pid = cleanProjectId(projectId);
  const url0 = `${RC_API_V2}/projects/${encodeURIComponent(pid)}/customers?limit=100`;
  console.log(`[revenuecat] Fetching customers from: ${url0}`);
  let url = url0;

  while (url) {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 30000,
    });

    const items = response.data.items || [];
    for (const customer of items) {
      yield customer;
    }

    // next_page is a full path like /v2/projects/.../customers?starting_after=...
    const nextPage = response.data.next_page;
    url = nextPage ? `https://api.revenuecat.com${nextPage}` : null;
  }
}

/**
 * Fetch all purchases for a single customer.
 * @param {string} apiKey
 * @param {string} projectId
 * @param {string} customerId
 * @returns {Promise<Array>} Array of purchase objects
 */
async function fetchCustomerPurchases(apiKey, projectId, customerId) {
  const purchases = [];
  const pid = cleanProjectId(projectId);
  let url = `${RC_API_V2}/projects/${encodeURIComponent(pid)}/customers/${encodeURIComponent(customerId)}/purchases?limit=100`;

  while (url) {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 30000,
    });

    const items = response.data.items || [];
    purchases.push(...items);

    const nextPage = response.data.next_page;
    url = nextPage ? `https://api.revenuecat.com${nextPage}` : null;
  }

  return purchases;
}

/**
 * Fetch revenue data from RevenueCat by iterating all customers and their purchases.
 * Filters to the given date range.
 *
 * @param {string} apiKey - RevenueCat secret key
 * @param {string} projectId - RevenueCat project ID
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array<{ country: string, date: string, revenue: number, purchases: number, product: string, currency: string }>>}
 */
async function fetchRevenueData(apiKey, projectId, startDate, endDate) {
  const results = [];
  const startTs = new Date(startDate + 'T00:00:00Z').getTime();
  const endTs = new Date(endDate + 'T23:59:59Z').getTime();

  let customerCount = 0;

  for await (const customer of fetchAllCustomers(apiKey, projectId)) {
    customerCount++;
    const customerId = customer.id;
    if (!customerId) continue;

    try {
      const purchases = await fetchCustomerPurchases(apiKey, projectId, customerId);

      for (const purchase of purchases) {
        const purchasedAt = purchase.purchased_at
          ? new Date(purchase.purchased_at).getTime()
          : null;

        // Filter by date range
        if (!purchasedAt || purchasedAt < startTs || purchasedAt > endTs) continue;

        const price = parseFloat(purchase.price || purchase.revenue || 0);
        if (price <= 0) continue;

        results.push({
          country: (purchase.country_code || customer.country_code || '').toUpperCase().slice(0, 2),
          date: new Date(purchasedAt).toISOString().slice(0, 10),
          revenue: price,
          purchases: 1,
          product: purchase.product_id || 'unknown',
          currency: (purchase.currency || 'USD').toUpperCase(),
        });
      }
    } catch (err) {
      // Skip individual customer errors (e.g. deleted accounts)
      console.error(`[revenuecat] Error fetching purchases for customer ${customerId}:`, err.message);
      continue;
    }

    // Rate limit: RevenueCat recommends not hammering their API
    if (customerCount % 50 === 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`[revenuecat] Fetched ${results.length} transactions from ${customerCount} customers (${startDate} to ${endDate})`);
  return results;
}

/**
 * Process a RevenueCat webhook event and store in metrics_cache + campaign_metrics.
 * Kept for real-time updates between syncs.
 */
async function processWebhookEvent(userId, event) {
  const type = event.type;

  const revenueEvents = [
    'INITIAL_PURCHASE',
    'RENEWAL',
    'NON_RENEWING_PURCHASE',
    'UNCANCELLATION',
  ];

  if (!revenueEvents.includes(type)) {
    return { skipped: true, reason: `Event type ${type} is not a revenue event` };
  }

  const country = (event.country_code || '').toUpperCase().slice(0, 2);
  const currency = (event.currency || 'USD').toUpperCase();
  const priceInCurrency = parseFloat(event.price_in_purchased_currency || event.price || 0);
  const productId = event.product_id || 'unknown';
  const purchasedAt = event.purchased_at_ms
    ? new Date(event.purchased_at_ms).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  if (priceInCurrency <= 0) {
    return { skipped: true, reason: 'Zero or negative price' };
  }

  const revenue = await convertToUSD(priceInCurrency, currency);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (country) {
      await client.query(
        `INSERT INTO metrics_cache (user_id, country_code, date, platform, revenue, purchases)
         VALUES ($1, $2, $3, 'revenuecat', $4, 1)
         ON CONFLICT (user_id, country_code, date, platform) DO UPDATE
           SET revenue = metrics_cache.revenue + $4,
               purchases = metrics_cache.purchases + 1,
               cached_at = NOW()`,
        [userId, country, purchasedAt, Math.round(revenue * 100) / 100]
      );
    }

    await client.query(
      `INSERT INTO campaign_metrics (user_id, platform, campaign_id, country_code, date, revenue, purchases)
       VALUES ($1, 'revenuecat', $2, $3, $4, $5, 1)
       ON CONFLICT (user_id, platform, campaign_id, country_code, date) DO UPDATE
         SET revenue = campaign_metrics.revenue + $5,
             purchases = campaign_metrics.purchases + 1`,
      [userId, productId, country || '', purchasedAt, Math.round(revenue * 100) / 100]
    );

    await client.query('COMMIT');
    return { processed: true, type, country, revenue, product: productId, date: purchasedAt };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { fetchRevenueData, processWebhookEvent };
