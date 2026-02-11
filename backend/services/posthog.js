const axios = require('axios');

/**
 * Fetch revenue and purchase data from PostHog by country and date.
 * @param {string} apiKey - PostHog personal API key (Bearer)
 * @param {string} projectId - PostHog project ID
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array>} Rows of [country_code, date, total_revenue, purchases]
 */
async function fetchRevenueData(apiKey, projectId, startDate, endDate) {
  const query = `
    SELECT
      properties.country_code AS country,
      toDate(timestamp) AS date,
      sum(properties.revenue) AS total_revenue,
      count(*) AS purchases
    FROM events
    WHERE
      event = 'rc_initial_purchase'
      AND timestamp >= '${startDate}'
      AND timestamp < '${endDate}'
    GROUP BY country, date
    ORDER BY date DESC
  `;

  try {
    const response = await axios.post(
      `https://app.posthog.com/api/projects/${projectId}/query/`,
      {
        query: {
          kind: 'HogQLQuery',
          query: query
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.results || [];
  } catch (error) {
    console.error('PostHog API error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { fetchRevenueData };
