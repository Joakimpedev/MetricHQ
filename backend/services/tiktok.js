const axios = require('axios');

/**
 * Fetch ad spend (and related metrics) from TikTok Ads API by country.
 * @param {string} accessToken - TikTok OAuth access token
 * @param {string} advertiserId - TikTok advertiser ID
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array>} List of report rows with country_code, spend, etc.
 */
async function fetchAdSpend(accessToken, advertiserId, startDate, endDate) {
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

    return response.data?.data?.list || [];
  } catch (error) {
    console.error('TikTok API error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { fetchAdSpend };
