const { pool } = require('../db/database');
const { convertToUSD } = require('./exchange-rates');

/**
 * Process a RevenueCat webhook event and store in metrics_cache + campaign_metrics.
 *
 * RevenueCat sends events like INITIAL_PURCHASE, RENEWAL, NON_RENEWING_PURCHASE, etc.
 * Each event contains: price, currency, country_code, product_id, purchased_at_ms, app_user_id.
 *
 * We treat product_id as the "campaign" equivalent for campaign_metrics.
 */
async function processWebhookEvent(userId, event) {
  const type = event.type;

  // Only process revenue-generating events
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

    // Country-level revenue in metrics_cache
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

    // Product-level revenue in campaign_metrics
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

module.exports = { processWebhookEvent };
