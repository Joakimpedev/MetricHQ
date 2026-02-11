const { pool } = require('../db/database');
const { fetchRevenueData } = require('./posthog');
const { fetchAdSpend: fetchTikTokSpend } = require('./tiktok');
const { fetchAdSpend: fetchMetaSpend } = require('./meta');

// Optional: map country codes to display names for API response
const COUNTRY_NAMES = {
  NO: 'Norway', SE: 'Sweden', US: 'United States', GB: 'United Kingdom',
  DE: 'Germany', FR: 'France', ES: 'Spain', IT: 'Italy', NL: 'Netherlands',
  PL: 'Poland', DK: 'Denmark', FI: 'Finland', CA: 'Canada', AU: 'Australia'
};

/**
 * Aggregate ad spend (TikTok, Meta) and revenue (PostHog) by country for a user.
 * @param {number} userId - Internal user id (users.id)
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array<{ code: string, name: string, spend, revenue, profit, roas, purchases }>>}
 */
async function aggregateMetrics(userId, startDate, endDate) {
  const accountsResult = await pool.query(
    'SELECT platform, account_id, access_token FROM connected_accounts WHERE user_id = $1',
    [userId]
  );

  const accountMap = {};
  accountsResult.rows.forEach(acc => {
    accountMap[acc.platform] = acc;
  });

  const [revenueData, tiktokData, metaData] = await Promise.all([
    accountMap.posthog
      ? fetchRevenueData(
          accountMap.posthog.access_token,
          accountMap.posthog.account_id,
          startDate,
          endDate
        )
      : Promise.resolve([]),
    accountMap.tiktok
      ? fetchTikTokSpend(
          accountMap.tiktok.access_token,
          accountMap.tiktok.account_id,
          startDate,
          endDate
        )
      : Promise.resolve([]),
    accountMap.meta
      ? fetchMetaSpend(
          accountMap.meta.access_token,
          accountMap.meta.account_id,
          startDate,
          endDate
        )
      : Promise.resolve([])
  ]);

  const countryMetrics = {};

  // PostHog can return array of arrays or array of objects depending on API
  const revenueRows = Array.isArray(revenueData) ? revenueData : [];
  revenueRows.forEach(row => {
    const country = Array.isArray(row) ? row[0] : (row.country ?? row.country_code);
    const revenue = Array.isArray(row) ? parseFloat(row[2]) : parseFloat(row.total_revenue ?? row.revenue ?? 0);
    const purchases = Array.isArray(row) ? parseInt(row[3], 10) : parseInt(row.purchases ?? 0, 10);
    if (!country) return;
    const code = String(country).toUpperCase().slice(0, 2);
    if (!countryMetrics[code]) {
      countryMetrics[code] = { revenue: 0, spend: 0, purchases: 0 };
    }
    countryMetrics[code].revenue += revenue;
    countryMetrics[code].purchases += purchases;
  });

  (tiktokData || []).forEach(row => {
    const country = row.country_code || row.country;
    if (!country) return;
    const code = String(country).toUpperCase().slice(0, 2);
    if (!countryMetrics[code]) {
      countryMetrics[code] = { revenue: 0, spend: 0, purchases: 0 };
    }
    countryMetrics[code].spend += parseFloat(row.spend || 0);
  });

  (metaData || []).forEach(row => {
    const country = row.country;
    if (!country) return;
    const code = String(country).toUpperCase().slice(0, 2);
    if (!countryMetrics[code]) {
      countryMetrics[code] = { revenue: 0, spend: 0, purchases: 0 };
    }
    countryMetrics[code].spend += parseFloat(row.spend || 0);
  });

  const results = Object.entries(countryMetrics).map(([code, data]) => ({
    code,
    name: COUNTRY_NAMES[code] || code,
    spend: Math.round(data.spend * 100) / 100,
    revenue: Math.round(data.revenue * 100) / 100,
    profit: Math.round((data.revenue - data.spend) * 100) / 100,
    roas: data.spend > 0 ? parseFloat((data.revenue / data.spend).toFixed(2)) : 0,
    purchases: data.purchases
  }));

  return results;
}

module.exports = { aggregateMetrics };
