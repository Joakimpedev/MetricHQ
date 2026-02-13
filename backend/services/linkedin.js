const axios = require('axios');

/**
 * Fetch ad spend from LinkedIn Marketing API.
 * Note: LinkedIn does NOT support geographic breakdown in analytics.
 * All data comes back without country information.
 *
 * @param {string} accessToken - OAuth2 access token
 * @param {string} accountId - LinkedIn ad account ID
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Array<{ campaign_id, date, spend, impressions, clicks }>}
 */
async function fetchAdSpend(accessToken, accountId, startDate, endDate) {
  const start = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');

  const response = await axios.get('https://api.linkedin.com/rest/adAnalytics', {
    params: {
      q: 'analytics',
      pivot: 'CAMPAIGN',
      timeGranularity: 'DAILY',
      'dateRange.start.year': start.getUTCFullYear(),
      'dateRange.start.month': start.getUTCMonth() + 1,
      'dateRange.start.day': start.getUTCDate(),
      'dateRange.end.year': end.getUTCFullYear(),
      'dateRange.end.month': end.getUTCMonth() + 1,
      'dateRange.end.day': end.getUTCDate(),
      accounts: `urn:li:sponsoredAccount:${accountId}`,
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'LinkedIn-Version': '202402',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    timeout: 30000,
  });

  const elements = response.data?.elements || [];
  const results = [];

  for (const el of elements) {
    // Campaign URN format: urn:li:sponsoredCampaign:12345
    const campaignUrn = el.pivotValues?.[0] || '';
    const campaignId = campaignUrn.replace('urn:li:sponsoredCampaign:', '') || 'unknown';

    const dateRange = el.dateRange?.start;
    const date = dateRange
      ? `${dateRange.year}-${String(dateRange.month).padStart(2, '0')}-${String(dateRange.day).padStart(2, '0')}`
      : endDate;

    // LinkedIn reports cost in the account's currency, as a decimal string
    const spend = parseFloat(el.costInLocalCurrency || el.costInUsd || '0');
    const impressions = parseInt(el.impressions || '0', 10);
    const clicks = parseInt(el.clicks || '0', 10);

    results.push({
      campaign_id: campaignId,
      date,
      spend,
      impressions,
      clicks,
    });
  }

  return results;
}

module.exports = { fetchAdSpend };
