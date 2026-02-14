'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';

/** All supported currency codes */
export const ALL_CURRENCIES = [
  'USD','EUR','GBP','CAD','AUD','JPY','CHF','CNY','SEK','NOK','DKK','NZD','SGD','HKD',
  'KRW','INR','BRL','MXN','ZAR','TRY','PLN','THB','IDR','MYR','PHP','VND','CZK','ILS',
  'HUF','RON','BGN','HRK','ISK','RUB','UAH','AED','AFN','ALL','AMD','ANG','AOA','ARS',
  'AWG','AZN','BAM','BBD','BDT','BHD','BIF','BMD','BND','BOB','BSD','BTN','BWP','BYN',
  'BZD','CDF','CLF','CLP','CNH','COP','CRC','CUC','CUP','CVE','DJF','DOP','DZD','EGP',
  'ERN','ETB','FJD','FKP','GEL','GGP','GHS','GIP','GMD','GNF','GTQ','GYD','HNL','HTG',
  'IMP','IQD','IRR','JEP','JMD','JOD','KES','KGS','KHR','KMF','KPW','KWD','KYD','KZT',
  'LAK','LBP','LKR','LRD','LSL','LYD','MAD','MDL','MGA','MKD','MMK','MNT','MOP','MRU',
  'MUR','MVR','MWK','MZN','NAD','NGN','NIO','NPR','OMR','PAB','PEN','PGK','PKR','PYG',
  'QAR','RSD','RWF','SAR','SBD','SCR','SDG','SHP','SLE','SLL','SOS','SRD','SSP','STD',
  'STN','SVC','SYP','SZL','TJS','TMT','TND','TOP','TTD','TWD','TZS','UGX','UYU','UZS',
  'VES','VUV','WST','XAF','XCD','XOF','XPF','YER','ZMW','ZWG','ZWL',
] as const;

export type CurrencyCode = string;

/** Common currencies shown at the top of dropdowns */
export const POPULAR_CURRENCIES = ['USD','EUR','GBP','CAD','AUD','JPY','CHF','SEK','NOK','DKK','NZD','SGD','INR','BRL'];

const STORAGE_KEY = 'metrichq-currency';
const RATES_STORAGE_KEY = 'metrichq-exchange-rates';
const RATES_TTL = 24 * 60 * 60 * 1000; // 24h

const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, NOK: 10.8, SEK: 10.5, DKK: 6.9, CAD: 1.36,
  AUD: 1.55, JPY: 150, CHF: 0.88, CNY: 7.24, NZD: 1.68, SGD: 1.34, HKD: 7.82,
  INR: 83.1, BRL: 4.97, MXN: 17.1, ZAR: 18.6, TRY: 30.2, PLN: 4.02,
};

interface RatesCache {
  rates: Record<string, number>;
  fetchedAt: number;
}

interface CurrencyContextValue {
  currency: string;
  setCurrency: (c: string) => void;
  rates: Record<string, number>;
  convertFromCurrency: (amount: number, fromCurrency: string, toCurrency?: string) => number;
  formatCurrency: (amount: number, fromCurrency?: string) => string;
  formatCurrencyCompact: (amount: number, fromCurrency?: string) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

/** Format using Intl for proper symbol/placement for any currency */
function intlFormat(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback for unknown currency codes
    return `${currencyCode} ${Math.round(amount).toLocaleString()}`;
  }
}

function intlFormatCompact(amount: number, currencyCode: string): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1000) {
    const compact = `${(abs / 1000).toFixed(1)}k`;
    // Get the currency symbol
    try {
      const parts = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
      }).formatToParts(1);
      const symbolPart = parts.find(p => p.type === 'currency');
      const symbol = symbolPart?.value || currencyCode;
      // Check if symbol comes before or after
      const symbolIndex = parts.findIndex(p => p.type === 'currency');
      const integerIndex = parts.findIndex(p => p.type === 'integer');
      if (symbolIndex < integerIndex) {
        return `${sign}${symbol}${compact}`;
      }
      return `${sign}${compact} ${symbol}`;
    } catch {
      return `${sign}${currencyCode} ${compact}`;
    }
  }
  return intlFormat(amount, currencyCode);
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<string>('USD');
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCurrencyState(saved);

      const cachedStr = localStorage.getItem(RATES_STORAGE_KEY);
      if (cachedStr) {
        const cached: RatesCache = JSON.parse(cachedStr);
        if (Date.now() - cached.fetchedAt < RATES_TTL && cached.rates) {
          setRates(cached.rates);
          return;
        }
      }
    } catch { /* ignore */ }

    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => {
        if (data?.rates) {
          setRates(data.rates);
          try {
            localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify({
              rates: data.rates,
              fetchedAt: Date.now(),
            }));
          } catch { /* quota exceeded */ }
        }
      })
      .catch(() => {});
  }, []);

  const setCurrency = useCallback((c: string) => {
    setCurrencyState(c);
    try { localStorage.setItem(STORAGE_KEY, c); } catch { /* ignore */ }
  }, []);

  const convertFromCurrency = useCallback((amount: number, fromCurrency: string, toCurrency?: string) => {
    const target = toCurrency || currency;
    if (fromCurrency === target) return amount;
    const fromRate = rates[fromCurrency] || FALLBACK_RATES[fromCurrency] || 1;
    const toRate = rates[target] || FALLBACK_RATES[target] || 1;
    return (amount / fromRate) * toRate;
  }, [currency, rates]);

  const formatCurrency = useCallback((amount: number, fromCurrency?: string) => {
    const from = fromCurrency || 'USD';
    const converted = from === currency ? amount : convertFromCurrency(amount, from);
    return intlFormat(converted, currency);
  }, [currency, convertFromCurrency]);

  const formatCurrencyCompact = useCallback((amount: number, fromCurrency?: string) => {
    const from = fromCurrency || 'USD';
    const converted = from === currency ? amount : convertFromCurrency(amount, from);
    return intlFormatCompact(converted, currency);
  }, [currency, convertFromCurrency]);

  const value = useMemo(() => ({
    currency,
    setCurrency,
    rates,
    convertFromCurrency,
    formatCurrency,
    formatCurrencyCompact,
  }), [currency, setCurrency, rates, convertFromCurrency, formatCurrency, formatCurrencyCompact]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
