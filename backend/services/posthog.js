const axios = require('axios');

const DEFAULT_EVENT = 'rc_initial_purchase';
const DEFAULT_HOST = 'https://us.posthog.com';

/**
 * Fetch revenue and purchase data from PostHog by country and date.
 * @param {string} apiKey - PostHog personal API key (Bearer)
 * @param {string} projectId - PostHog project ID
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {object} [options]
 * @param {string} [options.purchaseEvent] - Custom event name (default: rc_initial_purchase)
 * @param {string} [options.posthogHost] - PostHog host (default: https://us.posthog.com)
 * @returns {Promise<Array>} Rows of [country_code, date, total_revenue, purchases]
 */
async function fetchRevenueData(apiKey, projectId, startDate, endDate, options = {}) {
  const eventName = options.purchaseEvent || DEFAULT_EVENT;
  const host = options.posthogHost || DEFAULT_HOST;

  // Sanitize event name — only allow alphanumeric, underscores, hyphens, dots, spaces
  const safeEvent = eventName.replace(/[^a-zA-Z0-9_ .\-]/g, '');

  // endDate is inclusive (e.g. "2026-02-13" means include all of Feb 13),
  // but timestamp < requires the next day to capture the full last day
  const endExclusive = new Date(endDate + 'T00:00:00Z');
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  const endNext = endExclusive.toISOString().slice(0, 10);

  const query = `
    SELECT
      properties.$geoip_country_code AS country,
      toDate(timestamp) AS date,
      sum(properties.revenue) AS total_revenue,
      count(*) AS purchases
    FROM events
    WHERE
      event = '${safeEvent}'
      AND timestamp >= '${startDate}'
      AND timestamp < '${endNext}'
    GROUP BY country, date
    ORDER BY date DESC
  `;

  try {
    const response = await axios.post(
      `${host}/api/projects/${projectId}/query/`,
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
        },
        timeout: 30000
      }
    );

    return response.data.results || [];
  } catch (error) {
    console.error('PostHog API error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { fetchRevenueData };
