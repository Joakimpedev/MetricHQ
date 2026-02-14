'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'NOK';

const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  NOK: 10.8,
};

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
  NOK: 'kr',
};

const STORAGE_KEY = 'metrichq-currency';
const RATES_STORAGE_KEY = 'metrichq-exchange-rates';
const RATES_TTL = 24 * 60 * 60 * 1000; // 24h

interface RatesCache {
  rates: Record<string, number>;
  fetchedAt: number;
}

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  rates: Record<string, number>;
  convertFromCurrency: (amount: number, fromCurrency: string, toCurrency?: string) => number;
  formatCurrency: (amount: number, fromCurrency?: string) => string;
  formatCurrencyCompact: (amount: number, fromCurrency?: string) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);

  // Load saved currency + cached rates from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
      if (saved && saved in CURRENCY_SYMBOLS) setCurrencyState(saved);

      const cachedStr = localStorage.getItem(RATES_STORAGE_KEY);
      if (cachedStr) {
        const cached: RatesCache = JSON.parse(cachedStr);
        if (Date.now() - cached.fetchedAt < RATES_TTL && cached.rates) {
          setRates(cached.rates);
          return; // Still fresh, don't re-fetch
        }
      }
    } catch { /* ignore */ }

    // Fetch fresh rates
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
      .catch(() => {
        // Use fallback rates
      });
  }, []);

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c);
    try { localStorage.setItem(STORAGE_KEY, c); } catch { /* ignore */ }
  }, []);

  const convertFromCurrency = useCallback((amount: number, fromCurrency: string, toCurrency?: string) => {
    const target = toCurrency || currency;
    if (fromCurrency === target) return amount;
    // Convert via USD as intermediary
    const fromRate = rates[fromCurrency] || FALLBACK_RATES[fromCurrency] || 1;
    const toRate = rates[target] || FALLBACK_RATES[target] || 1;
    return (amount / fromRate) * toRate;
  }, [currency, rates]);

  const formatCurrency = useCallback((amount: number, fromCurrency?: string) => {
    const from = fromCurrency || 'USD';
    const converted = from === currency ? amount : convertFromCurrency(amount, from);
    const symbol = CURRENCY_SYMBOLS[currency] || '$';
    const isNeg = converted < 0;
    const abs = Math.abs(converted);

    if (currency === 'NOK') {
      return `${isNeg ? '-' : ''}${Math.round(abs).toLocaleString()} ${symbol}`;
    }
    return `${isNeg ? '-' : ''}${symbol}${Math.round(abs).toLocaleString()}`;
  }, [currency, convertFromCurrency]);

  const formatCurrencyCompact = useCallback((amount: number, fromCurrency?: string) => {
    const from = fromCurrency || 'USD';
    const converted = from === currency ? amount : convertFromCurrency(amount, from);
    const symbol = CURRENCY_SYMBOLS[currency] || '$';
    const isNeg = converted < 0;
    const abs = Math.abs(converted);

    let formatted: string;
    if (abs >= 1000) {
      formatted = `${(abs / 1000).toFixed(1)}k`;
    } else {
      formatted = Math.round(abs).toLocaleString();
    }

    if (currency === 'NOK') {
      return `${isNeg ? '-' : ''}${formatted} ${symbol}`;
    }
    return `${isNeg ? '-' : ''}${symbol}${formatted}`;
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
