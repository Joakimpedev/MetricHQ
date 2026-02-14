const { pool } = require('../db/database');
const { syncForUser } = require('./sync');
const { getUserSubscription } = require('./subscription');

const COUNTRY_NAMES = {
  NO: 'Norway', SE: 'Sweden', US: 'United States', GB: 'United Kingdom',
  DE: 'Germany', FR: 'France', ES: 'Spain', IT: 'Italy', NL: 'Netherlands',
  PL: 'Poland', DK: 'Denmark', FI: 'Finland', CA: 'Canada', AU: 'Australia'
};

/**
 * Aggregate metrics from local DB cache.
 * On first load (no cached rows), triggers a sync then reads from DB.
 */
async function aggregateMetrics(userId, startDate, endDate) {
  // Check if we have any cached data at all
  const cacheCheck = await pool.query(
    'SELECT COUNT(*) as cnt FROM metrics_cache WHERE user_id = $1',
    [userId]
  );

  if (parseInt(cacheCheck.rows[0].cnt, 10) === 0) {
    // First load — trigger sync (blocking), then read from DB
    try { await syncForUser(userId); } catch (err) {
      console.error('[aggregator] First-load sync failed:', err.message);
    }
  }

  // Get subscription for feature gating
  const sub = await getUserSubscription(userId);

  // Data retention clamping: don't return data older than plan allows
  let dataRetentionLimit = null;
  if (sub.limits.dataRetentionDays !== Infinity) {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - sub.limits.dataRetentionDays);
    const minDateStr = minDate.toISOString().slice(0, 10);
    dataRetentionLimit = { days: sub.limits.dataRetentionDays, earliestDate: minDateStr };
    if (startDate < minDateStr) {
      startDate = minDateStr;
    }
  }

  // ---- Read country-level metrics from metrics_cache ----
  const metricsResult = await pool.query(
    `SELECT country_code,
            COALESCE(SUM(spend), 0) as spend,
            COALESCE(SUM(revenue), 0) as revenue,
            COALESCE(SUM(impressions), 0) as impressions,
            COALESCE(SUM(clicks), 0) as clicks,
            COALESCE(SUM(purchases), 0) as purchases
     FROM metrics_cache
     WHERE user_id = $1 AND date >= $2 AND date <= $3
     GROUP BY country_code`,
    [userId, startDate, endDate]
  );

  // ---- Build country metrics ----
  const countryMetrics = {};
  let totalRevenue = 0;
  let totalSpend = 0;
  let totalPurchases = 0;

  for (const row of metricsResult.rows) {
    const code = row.country_code;
    if (!code) continue;
    const spend = parseFloat(row.spend);
    const revenue = parseFloat(row.revenue);
    const purchases = parseInt(row.purchases, 10);

    countryMetrics[code] = {
      spend,
      revenue,
      purchases
    };
    totalSpend += spend;
    totalRevenue += revenue;
    totalPurchases += purchases;
  }

  const countries = Object.entries(countryMetrics).map(([code, data]) => ({
    code,
    name: COUNTRY_NAMES[code] || code,
    spend: Math.round(data.spend * 100) / 100,
    revenue: Math.round(data.revenue * 100) / 100,
    profit: Math.round((data.revenue - data.spend) * 100) / 100,
    roas: data.spend > 0 ? parseFloat((data.revenue / data.spend).toFixed(2)) : 0,
    purchases: data.purchases
  }));

  // ---- Read campaign-level data from campaign_metrics ----
  const campaignResult = await pool.query(
    `SELECT platform, campaign_id,
            COALESCE(SUM(spend), 0) as spend,
            COALESCE(SUM(impressions), 0) as impressions,
            COALESCE(SUM(clicks), 0) as clicks,
            COALESCE(SUM(revenue), 0) as revenue,
            COALESCE(SUM(purchases), 0) as purchases
     FROM campaign_metrics
     WHERE user_id = $1 AND date >= $2 AND date <= $3
     GROUP BY platform, campaign_id`,
    [userId, startDate, endDate]
  );

  // Group campaigns by platform
  const platformData = {};
  for (const row of campaignResult.rows) {
    const plat = row.platform;
    if (!platformData[plat]) {
      platformData[plat] = { totalSpend: 0, totalRevenue: 0, campaigns: [] };
    }
    const spend = parseFloat(row.spend);
    const revenue = parseFloat(row.revenue);
    const purchases = parseInt(row.purchases, 10);
    platformData[plat].totalSpend += spend;
    platformData[plat].totalRevenue += revenue;
    platformData[plat].campaigns.push({
      ...(plat === 'meta' ? { campaignName: row.campaign_id } : { campaignId: row.campaign_id }),
      spend: Math.round(spend * 100) / 100,
      impressions: parseInt(row.impressions, 10),
      clicks: parseInt(row.clicks, 10),
      revenue: Math.round(revenue * 100) / 100,
      purchases,
      profit: Math.round((revenue - spend) * 100) / 100,
    });
  }

  // Round platform totals + campaign P&L gating
  const platforms = {};
  for (const [plat, data] of Object.entries(platformData)) {
    const platObj = {
      totalSpend: Math.round(data.totalSpend * 100) / 100,
      totalRevenue: Math.round(data.totalRevenue * 100) / 100,
      campaigns: data.campaigns,
    };

    // Gate campaign data for plans without campaignPL
    if (!sub.limits.campaignPL) {
      platObj.campaigns = [];
      platObj.gated = true;
    }

    platforms[plat] = platObj;
  }

  // ---- Time series (daily aggregates) ----
  const timeSeriesResult = await pool.query(
    `SELECT date,
            COALESCE(SUM(spend), 0) as spend,
            COALESCE(SUM(revenue), 0) as revenue,
            COALESCE(SUM(purchases), 0) as purchases
     FROM metrics_cache
     WHERE user_id = $1 AND date >= $2 AND date <= $3
     GROUP BY date
     ORDER BY date`,
    [userId, startDate, endDate]
  );

  const timeSeries = timeSeriesResult.rows.map(row => ({
    date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date).split('T')[0],
    spend: Math.round(parseFloat(row.spend) * 100) / 100,
    revenue: Math.round(parseFloat(row.revenue) * 100) / 100,
    profit: Math.round((parseFloat(row.revenue) - parseFloat(row.spend)) * 100) / 100,
    purchases: parseInt(row.purchases, 10)
  }));

  // ---- Summary ----
  totalSpend = Math.round(totalSpend * 100) / 100;
  totalRevenue = Math.round(totalRevenue * 100) / 100;
  const totalProfit = Math.round((totalRevenue - totalSpend) * 100) / 100;

  const summary = {
    totalSpend,
    totalRevenue,
    totalProfit,
    cpa: totalPurchases > 0 ? parseFloat((totalSpend / totalPurchases).toFixed(2)) : 0,
    totalPurchases
  };

  return { summary, platforms, countries, timeSeries, dataRetentionLimit };
}

module.exports = { aggregateMetrics };
