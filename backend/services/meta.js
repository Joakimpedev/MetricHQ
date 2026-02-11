const axios = require('axios');

/**
 * Fetch ad spend and insights from Meta Marketing API by country.
 * @param {string} accessToken - Meta OAuth access token
 * @param {string} adAccountId - Meta ad account ID (e.g. act_123456)
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array>} List of insight rows with country, spend, etc.
 */
async function fetchAdSpend(accessToken, adAccountId, startDate, endDate) {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v19.0/${adAccountId}/insights`,
      {
        params: {
          access_token: accessToken,
          fields: 'campaign_name,country,spend,impressions,clicks',
          time_range: JSON.stringify({
            since: startDate,
            until: endDate
          }),
          level: 'campaign',
          breakdowns: 'country'
        }
      }
    );

    return response.data?.data || [];
  } catch (error) {
    console.error('Meta API error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { fetchAdSpend };
