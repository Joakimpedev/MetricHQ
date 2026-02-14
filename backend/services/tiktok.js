const axios = require('axios');

/**
 * Fetch the advertiser's currency from TikTok.
 */
async function fetchAdvertiserCurrency(accessToken, advertiserId) {
  try {
    const response = await axios.get(
      'https://business-api.tiktok.com/open_api/v1.3/advertiser/info/',
      {
        params: { advertiser_ids: JSON.stringify([advertiserId]), fields: JSON.stringify(['currency']) },
        headers: { 'Access-Token': accessToken },
        timeout: 15000,
      }
    );
    const advertiser = response.data?.data?.list?.[0];
    return advertiser?.currency || 'USD';
  } catch (err) {
    console.warn('[tiktok] Failed to fetch advertiser currency, defaulting to USD:', err.message);
    return 'USD';
  }
}

/**
 * Fetch ad spend (and related metrics) from TikTok Ads API by country.
 * @param {string} accessToken - TikTok OAuth access token
 * @param {string} advertiserId - TikTok advertiser ID
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<{ currency: string, rows: Array }>}
 */
async function fetchAdSpend(accessToken, advertiserId, startDate, endDate) {
  const currency = await fetchAdvertiserCurrency(accessToken, advertiserId);

  try {
    const response = await axios.get(
      'https://business-api.tiktok.com/open_api/v1.2/reports/integrated/get/',
      {
        params: {
          advertiser_id: advertiserId,
          dimensions: JSON.stringify(['campaign_id', 'country_code', 'stat_time_day']),
          metrics: JSON.stringify(['spend', 'impressions', 'clicks']),
          start_date: startDate,
          end_date: endDate,
          page_size: 1000
        },
        headers: {
          'Access-Token': accessToken
        }
      }
    );

    return { currency, rows: response.data?.data?.list || [] };
  } catch (error) {
    console.error('TikTok API error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { fetchAdSpend };
