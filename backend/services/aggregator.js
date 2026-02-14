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

  // ---- Read campaign-per-country data for hover tooltips ----
  const countryCampaignResult = await pool.query(
    `SELECT country_code, platform, campaign_id,
            COALESCE(SUM(spend), 0) as spend,
            COALESCE(SUM(revenue), 0) as revenue,
            COALESCE(SUM(impressions), 0) as impressions,
            COALESCE(SUM(clicks), 0) as clicks,
            COALESCE(SUM(purchases), 0) as purchases
     FROM campaign_metrics
     WHERE user_id = $1 AND date >= $2 AND date <= $3 AND country_code IS NOT NULL
     GROUP BY country_code, platform, campaign_id`,
    [userId, startDate, endDate]
  );

  // Group by country_code -> array of { platform, campaign, spend, revenue, ... }
  const countryCampaigns = {};
  for (const row of countryCampaignResult.rows) {
    const cc = row.country_code;
    if (!cc) continue;
    if (!countryCampaigns[cc]) countryCampaigns[cc] = [];
    countryCampaigns[cc].push({
      platform: row.platform,
      campaign: row.campaign_id,
      spend: Math.round(parseFloat(row.spend) * 100) / 100,
      revenue: Math.round(parseFloat(row.revenue) * 100) / 100,
      impressions: parseInt(row.impressions, 10),
      clicks: parseInt(row.clicks, 10),
      purchases: parseInt(row.purchases, 10),
    });
  }

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
  // Campaign-level totals include platforms without country breakdown (e.g. LinkedIn)
  let campaignTotalSpend = 0;
  for (const data of Object.values(platformData)) {
    campaignTotalSpend += data.totalSpend;
  }

  // Use the higher of country-level or campaign-level spend so KPIs include LinkedIn
  const countrySpend = totalSpend;
  totalSpend = Math.round(Math.max(totalSpend, campaignTotalSpend) * 100) / 100;
  totalRevenue = Math.round(totalRevenue * 100) / 100;
  const totalProfit = Math.round((totalRevenue - totalSpend) * 100) / 100;

  // Spend from platforms that don't report country breakdowns (LinkedIn)
  const unattributedSpend = Math.round(Math.max(0, campaignTotalSpend - countrySpend) * 100) / 100;

  const summary = {
    totalSpend,
    totalRevenue,
    totalProfit,
    cpa: totalPurchases > 0 ? parseFloat((totalSpend / totalPurchases).toFixed(2)) : 0,
    totalPurchases
  };

  // ---- Custom Costs ----
  let customCostsTotal = 0;
  const customCostsBreakdown = [];
  try {
    const costsResult = await pool.query(
      `SELECT * FROM custom_costs
       WHERE user_id = $1
         AND start_date <= $3
         AND (end_date IS NULL OR end_date >= $2)`,
      [userId, startDate, endDate]
    );

    const rangeStart = new Date(startDate + 'T00:00:00');
    const rangeEnd = new Date(endDate + 'T00:00:00');
    const rangeDays = Math.round((rangeEnd - rangeStart) / 86400000) + 1;

    // Build base metric lookup for variable costs (pre-custom-cost values)
    const platformSpendLookup = {};
    for (const [plat, data] of Object.entries(platformData)) {
      platformSpendLookup[plat + '_spend'] = data.totalSpend;
    }
    const baseMetrics = {
      revenue: totalRevenue,
      profit: totalProfit,
      total_ad_spend: totalSpend,
      google_ads_spend: platformSpendLookup.google_ads_spend || 0,
      meta_spend: platformSpendLookup.meta_spend || 0,
      tiktok_spend: platformSpendLookup.tiktok_spend || 0,
      linkedin_spend: platformSpendLookup.linkedin_spend || 0,
    };

    for (const cost of costsResult.rows) {
      let costAmount = 0;

      if (cost.cost_type === 'variable') {
        const pct = parseFloat(cost.percentage) || 0;
        const baseVal = baseMetrics[cost.base_metric] || 0;
        costAmount = (pct / 100) * baseVal;
      } else {
        // Fixed cost
        const amt = parseFloat(cost.amount) || 0;
        const costStart = new Date(cost.start_date instanceof Date ? cost.start_date.toISOString().split('T')[0] + 'T00:00:00' : cost.start_date + 'T00:00:00');
        const costEnd = cost.end_date
          ? new Date(cost.end_date instanceof Date ? cost.end_date.toISOString().split('T')[0] + 'T00:00:00' : cost.end_date + 'T00:00:00')
          : null;

        // Overlap: max(rangeStart, costStart) to min(rangeEnd, costEnd || rangeEnd)
        const overlapStart = costStart > rangeStart ? costStart : rangeStart;
        const overlapEnd = costEnd && costEnd < rangeEnd ? costEnd : rangeEnd;
        const daysActive = Math.max(0, Math.round((overlapEnd - overlapStart) / 86400000) + 1);

        if (daysActive <= 0) continue;

        if (!cost.repeat) {
          // One-time fixed: prorate across cost's total duration
          const totalCostDays = costEnd
            ? Math.round((costEnd - costStart) / 86400000) + 1
            : 1;
          costAmount = (amt / totalCostDays) * daysActive;
        } else {
          // Repeating fixed
          const interval = cost.repeat_interval;
          if (interval === 'daily') {
            costAmount = amt * daysActive;
          } else if (interval === 'weekly') {
            costAmount = (amt / 7) * daysActive;
          } else if (interval === 'monthly') {
            // Walk month-by-month for precise proration using actual days in each month
            costAmount = 0;
            const cursor = new Date(overlapStart);
            while (cursor <= overlapEnd) {
              const year = cursor.getFullYear();
              const month = cursor.getMonth();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              // Last day of this month as local midnight
              const monthLast = new Date(year, month + 1, 0);
              monthLast.setHours(0, 0, 0, 0);
              const segEnd = monthLast < overlapEnd ? monthLast : overlapEnd;
              const segDays = Math.round((segEnd - cursor) / 86400000) + 1;
              costAmount += (amt / daysInMonth) * segDays;
              // Move cursor to first day of next month
              cursor.setFullYear(year, month + 1, 1);
              cursor.setHours(0, 0, 0, 0);
            }
          }
        }
      }

      costAmount = Math.round(costAmount * 100) / 100;
      if (costAmount > 0) {
        customCostsTotal += costAmount;
        const item = {
          name: cost.name || 'Unnamed cost',
          category: cost.category || null,
          amount: costAmount,
          currency: cost.currency || 'USD',
        };

        // Include frequency info for proration display
        if (cost.cost_type === 'variable') {
          item.frequency = 'variable';
        } else if (cost.repeat && cost.repeat_interval) {
          item.frequency = cost.repeat_interval;
          item.configuredAmount = parseFloat(cost.amount) || 0;
          item.configuredCurrency = cost.currency || 'USD';
        } else {
          item.frequency = 'one-time';
          item.configuredAmount = parseFloat(cost.amount) || 0;
          item.configuredCurrency = cost.currency || 'USD';
        }

        customCostsBreakdown.push(item);
      }
    }

    customCostsTotal = Math.round(customCostsTotal * 100) / 100;
  } catch (err) {
    // Table may not exist yet during migration rollout — gracefully return 0
    if (err.code !== '42P01') {
      console.error('[aggregator] Custom costs error:', err.message);
    }
  }

  return { summary, platforms, countries, countryCampaigns, timeSeries, dataRetentionLimit, unattributedSpend, customCostsTotal, customCostsBreakdown };
}

module.exports = { aggregateMetrics };
