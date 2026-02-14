/**
 * Exchange rate utility — fetches rates from open.er-api.com and caches in memory.
 * All sync services convert to USD before storing in the database.
 */

const axios = require('axios');

let cachedRates = null;
let cachedAt = 0;
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

// Fallback rates for the most common currencies (approximate, updated Feb 2026)
const FALLBACK_RATES = {
  USD: 1, EUR: 0.92, GBP: 0.79, NOK: 10.8, SEK: 10.5, DKK: 6.9, CAD: 1.36,
  AUD: 1.55, JPY: 150, CHF: 0.88, CNY: 7.24, NZD: 1.68, SGD: 1.34, HKD: 7.82,
  INR: 83.1, BRL: 4.97, MXN: 17.1, ZAR: 18.6, TRY: 30.2, PLN: 4.02,
  KRW: 1320, THB: 35.1, IDR: 15700, MYR: 4.72, PHP: 56.2, VND: 24500,
  CZK: 23.2, ILS: 3.64, HUF: 362, RON: 4.59, BGN: 1.80, HRK: 6.93,
  RUB: 91.5, UAH: 41.2, AED: 3.67, SAR: 3.75, TWD: 31.5, PKR: 278,
  EGP: 30.9, NGN: 1540, KES: 153, BDT: 110, COP: 3950, ARS: 870,
};

/**
 * Get exchange rates (1 USD = X foreign currency).
 * Returns cached rates if fresh, otherwise fetches from API.
 */
async function getRates() {
  if (cachedRates && Date.now() - cachedAt < CACHE_TTL) {
    return cachedRates;
  }

  try {
    const response = await axios.get('https://open.er-api.com/v6/latest/USD', {
      timeout: 10000,
    });
    if (response.data?.rates) {
      cachedRates = response.data.rates;
      cachedAt = Date.now();
      return cachedRates;
    }
  } catch (err) {
    console.error('[exchange-rates] Failed to fetch rates:', err.message);
  }

  // Return fallback or previously cached rates
  return cachedRates || FALLBACK_RATES;
}

/**
 * Convert an amount from a source currency to USD.
 * @param {number} amount - The amount in the source currency
 * @param {string} fromCurrency - ISO 4217 currency code (e.g. 'EUR', 'GBP')
 * @returns {Promise<number>} Amount converted to USD
 */
async function convertToUSD(amount, fromCurrency) {
  if (!amount || amount === 0) return 0;
  if (!fromCurrency || fromCurrency === 'USD') return amount;

  const rates = await getRates();
  const rate = rates[fromCurrency.toUpperCase()];
  if (!rate) {
    console.warn(`[exchange-rates] Unknown currency "${fromCurrency}", treating as USD`);
    return amount;
  }

  // rates are "1 USD = X foreign", so to convert foreign → USD: amount / rate
  return amount / rate;
}

module.exports = { getRates, convertToUSD };
