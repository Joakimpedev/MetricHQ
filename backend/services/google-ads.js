const axios = require('axios');

/**
 * Google Ads geo criterion IDs → ISO 3166-1 alpha-2 country codes.
 * Only the most common ~50 countries; others fall back to ''.
 */
const GEO_CRITERIA = {
  2840: 'US', 2826: 'GB', 2124: 'CA', 2036: 'AU', 2276: 'DE',
  2250: 'FR', 2380: 'IT', 2724: 'ES', 2528: 'NL', 2616: 'PL',
  2578: 'NO', 2752: 'SE', 2208: 'DK', 2246: 'FI', 2756: 'CH',
  2040: 'AT', 2056: 'BE', 2372: 'IE', 2620: 'PT', 2203: 'CZ',
  2348: 'HU', 2642: 'RO', 2100: 'BG', 2191: 'HR', 2300: 'GR',
  2703: 'SK', 2705: 'SI', 2428: 'LV', 2440: 'LT', 2233: 'EE',
  2392: 'JP', 2410: 'KR', 2156: 'CN', 2356: 'IN', 2076: 'BR',
  2484: 'MX', 2032: 'AR', 2152: 'CL', 2170: 'CO', 2604: 'PE',
  2710: 'ZA', 2566: 'NG', 2818: 'EG', 2784: 'AE', 2682: 'SA',
  2376: 'IL', 2792: 'TR', 2643: 'RU', 2804: 'UA', 2702: 'SG',
  2360: 'ID', 2764: 'TH', 2704: 'VN', 2608: 'PH', 2458: 'MY',
  2554: 'NZ',
};

/**
 * Fetch the account's currency code from Google Ads.
 */
async function fetchAccountCurrency(accessToken, customerId, developerToken) {
  const cleanCustomerId = String(customerId).replace(/-/g, '');
  try {
    const response = await axios.post(
      `https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/googleAds:searchStream`,
      { query: 'SELECT customer.currency_code FROM customer LIMIT 1' },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    const batches = Array.isArray(response.data) ? response.data : [response.data];
    const row = batches[0]?.results?.[0];
    return row?.customer?.currencyCode || 'USD';
  } catch (err) {
    console.warn('[google-ads] Failed to fetch account currency, defaulting to USD:', err.message);
    return 'USD';
  }
}

/**
 * Fetch ad spend from Google Ads API v20 via searchStream.
 *
 * @param {string} accessToken - OAuth2 access token
 * @param {string} customerId - Google Ads customer ID (digits only, no dashes)
 * @param {string} developerToken - Google Ads API developer token
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {{ currency: string, rows: Array<{ campaign_id, campaign_name, country, date, spend, impressions, clicks }> }}
 */
async function fetchAdSpend(accessToken, customerId, developerToken, startDate, endDate) {
  const cleanCustomerId = String(customerId).replace(/-/g, '');

  // Fetch account currency
  const currency = await fetchAccountCurrency(accessToken, cleanCustomerId, developerToken);

  const query = `
    SELECT campaign.id, campaign.name, geographic_view.country_criterion_id,
           segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks
    FROM geographic_view
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND campaign.status != 'REMOVED'
  `;

  const response = await axios.post(
    `https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/googleAds:searchStream`,
    { query },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );

  const results = [];
  // searchStream returns an array of result batches
  const batches = Array.isArray(response.data) ? response.data : [response.data];

  for (const batch of batches) {
    const rows = batch.results || [];
    for (const row of rows) {
      const geoCriterionId = row.geographicView?.countryCriterionId;
      const country = GEO_CRITERIA[geoCriterionId] || '';

      results.push({
        campaign_id: String(row.campaign?.id || 'unknown'),
        campaign_name: row.campaign?.name || 'Unknown Campaign',
        country,
        date: row.segments?.date || endDate,
        spend: (parseInt(row.metrics?.costMicros || '0', 10)) / 1_000_000,
        impressions: parseInt(row.metrics?.impressions || '0', 10),
        clicks: parseInt(row.metrics?.clicks || '0', 10),
      });
    }
  }

  return { currency, rows: results };
}

module.exports = { fetchAdSpend };
