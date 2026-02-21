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
    if (!nextPage) {
      url = null;
    } else if (nextPage.startsWith('http')) {
      url = nextPage;
    } else {
      url = `https://api.revenuecat.com${nextPage}`;
    }
  }
}

/**
 * Fetch all items from a paginated RevenueCat endpoint.
 */
async function fetchPaginated(apiKey, url) {
  const items = [];
  while (url) {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 30000,
    });
    items.push(...(response.data.items || []));
    const nextPage = response.data.next_page;
    if (!nextPage) {
      url = null;
    } else if (nextPage.startsWith('http')) {
      url = nextPage;
    } else {
      url = `https://api.revenuecat.com${nextPage}`;
    }
  }
  return items;
}

/**
 * Fetch all purchases AND subscriptions for a single customer.
 */
async function fetchCustomerTransactions(apiKey, projectId, customerId) {
  const pid = cleanProjectId(projectId);
  const base = `${RC_API_V2}/projects/${encodeURIComponent(pid)}/customers/${encodeURIComponent(customerId)}`;
  const [purchases, subscriptions] = await Promise.all([
    fetchPaginated(apiKey, `${base}/purchases?limit=100`),
    fetchPaginated(apiKey, `${base}/subscriptions?limit=100`),
  ]);
  return { purchases, subscriptions };
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

  // Collect all customers first, then fetch purchases in parallel batches
  const customers = [];
  for await (const customer of fetchAllCustomers(apiKey, projectId)) {
    if (customer.id) customers.push(customer);
  }
  console.log(`[revenuecat] Found ${customers.length} customers, fetching purchases in parallel...`);

  let debugLoggedPurchase = false;
  let debugLoggedSub = false;
  let customersWithData = 0;
  let totalPurchases = 0;
  let totalSubs = 0;

  const BATCH_SIZE = 10;
  for (let i = 0; i < customers.length; i += BATCH_SIZE) {
    const batch = customers.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (customer) => {
        const { purchases, subscriptions } = await fetchCustomerTransactions(apiKey, projectId, customer.id);
        const hasData = purchases.length > 0 || subscriptions.length > 0;
        if (hasData) customersWithData++;
        totalPurchases += purchases.length;
        totalSubs += subscriptions.length;

        // Debug: log first raw objects we see
        if (purchases.length > 0 && !debugLoggedPurchase) {
          debugLoggedPurchase = true;
          console.log(`[revenuecat] DEBUG raw purchase:`, JSON.stringify(purchases[0]).slice(0, 800));
        }
        if (subscriptions.length > 0 && !debugLoggedSub) {
          debugLoggedSub = true;
          console.log(`[revenuecat] DEBUG raw subscription:`, JSON.stringify(subscriptions[0]).slice(0, 800));
        }

        const matched = [];

        // Process one-time purchases
        for (const purchase of purchases) {
          const purchasedAt = purchase.purchased_at
            ? new Date(purchase.purchased_at).getTime()
            : null;
          if (!purchasedAt || purchasedAt < startTs || purchasedAt > endTs) continue;
          const price = parseFloat(purchase.price || purchase.revenue || 0);
          if (price <= 0) continue;
          matched.push({
            country: (purchase.country_code || customer.country_code || '').toUpperCase().slice(0, 2),
            date: new Date(purchasedAt).toISOString().slice(0, 10),
            revenue: price,
            purchases: 1,
            product: purchase.product_id || 'unknown',
            currency: (purchase.currency || 'USD').toUpperCase(),
          });
        }

        // Process subscriptions — use current_period_starts_at as the transaction date
        for (const sub of subscriptions) {
          const subDate = sub.current_period_starts_at || sub.starts_at || sub.purchased_at;
          const subTs = subDate ? new Date(subDate).getTime() : null;
          if (!subTs || subTs < startTs || subTs > endTs) continue;
          // Try multiple possible price fields
          const price = parseFloat(sub.price || sub.revenue || sub.total_revenue || 0);
          if (price <= 0) continue;
          matched.push({
            country: (sub.country_code || customer.country_code || '').toUpperCase().slice(0, 2),
            date: new Date(subTs).toISOString().slice(0, 10),
            revenue: price,
            purchases: 1,
            product: sub.product_id || 'unknown',
            currency: (sub.currency || 'USD').toUpperCase(),
          });
        }

        return matched;
      })
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(...result.value);
      } else {
        console.error(`[revenuecat] Error fetching purchases:`, result.reason?.message);
      }
    }

    const processed = Math.min(i + BATCH_SIZE, customers.length);
    if (processed % 100 === 0 || processed === customers.length) {
      console.log(`[revenuecat] Processed ${processed}/${customers.length} customers, ${results.length} transactions found`);
    }
  }

  console.log(`[revenuecat] Summary: ${customers.length} customers, ${customersWithData} had data, ${totalPurchases} purchases + ${totalSubs} subscriptions, ${results.length} matched date filter (${startDate} to ${endDate})`);
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
