'use client';

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Globe } from 'lucide-react';
import Link from 'next/link';

interface Country {
  code: string;
  name: string;
  spend: number;
  revenue: number;
  profit: number;
  roas: number;
  purchases: number;
}

interface CountryBreakdownProps {
  countries: Country[];
}

type SortKey = 'spend' | 'purchases' | 'profit' | 'cpa';
type SortDir = 'asc' | 'desc';

const INITIAL_SHOW = 5;

function CountryFlag({ code }: { code: string }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w40/${code.toLowerCase()}.png 1x, https://flagcdn.com/w80/${code.toLowerCase()}.png 2x`}
      alt={code}
      className="w-5 h-3.5 object-cover rounded-[2px] shrink-0"
      loading="lazy"
    />
  );
}

export default function CountryBreakdown({ countries }: CountryBreakdownProps) {
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...countries];
    arr.sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === 'cpa') {
        av = a.purchases > 0 ? a.spend / a.purchases : Infinity;
        bv = b.purchases > 0 ? b.spend / b.purchases : Infinity;
      } else {
        av = a[sortKey];
        bv = b[sortKey];
      }
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return arr;
  }, [countries, sortKey, sortDir]);

  const displayed = showAll ? sorted : sorted.slice(0, INITIAL_SHOW);
  const hasMore = countries.length > INITIAL_SHOW;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return null;
    return sortDir === 'desc' ? (
      <ChevronDown size={12} className="inline ml-0.5" />
    ) : (
      <ChevronUp size={12} className="inline ml-0.5" />
    );
  }

  const headerClass = 'text-[10px] uppercase tracking-wider cursor-pointer select-none transition-colors hover:text-text-body';

  return (
    <div className="bg-bg-surface rounded-xl border border-border-dim overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-dim">
        <h3 className="text-[13px] font-medium text-text-heading">Countries</h3>
        {countries.length > 0 && (
          <span className="text-[11px] text-text-dim">
            {countries.length} {countries.length === 1 ? 'country' : 'countries'}
          </span>
        )}
      </div>

      {countries.length > 0 && (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_5rem_4.5rem_5.5rem_4.5rem] gap-2 px-5 py-2 border-b border-border-dim">
            <span className="text-[10px] uppercase tracking-wider text-text-dim">Country</span>
            <button onClick={() => handleSort('spend')} className={`${headerClass} text-right ${sortKey === 'spend' ? 'text-text-body' : 'text-text-dim'}`}>
              Spend<SortIcon col="spend" />
            </button>
            <button onClick={() => handleSort('purchases')} className={`${headerClass} text-right ${sortKey === 'purchases' ? 'text-text-body' : 'text-text-dim'}`}>
              Purch.<SortIcon col="purchases" />
            </button>
            <button onClick={() => handleSort('profit')} className={`${headerClass} text-right ${sortKey === 'profit' ? 'text-text-body' : 'text-text-dim'}`}>
              Profit<SortIcon col="profit" />
            </button>
            <button onClick={() => handleSort('cpa')} className={`${headerClass} text-right ${sortKey === 'cpa' ? 'text-text-body' : 'text-text-dim'}`}>
              CPA<SortIcon col="cpa" />
            </button>
          </div>

          {/* Rows */}
          {displayed.map(c => {
            const cpa = c.purchases > 0 ? c.spend / c.purchases : 0;
            return (
              <div
                key={c.code}
                className="grid grid-cols-[1fr_5rem_4.5rem_5.5rem_4.5rem] gap-2 px-5 py-3 border-b border-border-dim/40 last:border-0 hover:bg-bg-hover transition-colors items-center"
              >
                <div className="flex items-center gap-2.5">
                  <CountryFlag code={c.code} />
                  <span className="text-[13px] font-medium text-text-heading">{c.name}</span>
                </div>
                <span className="text-[12px] text-text-body text-right">${c.spend.toLocaleString()}</span>
                <span className="text-[12px] text-text-body text-right">{c.purchases.toLocaleString()}</span>
                <span className={`text-[12px] font-semibold text-right ${c.profit >= 0 ? 'text-success' : 'text-error'}`}>
                  {c.profit >= 0 ? '+' : ''}${c.profit.toLocaleString()}
                </span>
                <span className="text-[12px] text-text-body text-right">
                  {cpa > 0 ? `$${cpa.toFixed(2)}` : '—'}
                </span>
              </div>
            );
          })}

          {/* Show all / Show less */}
          {hasMore && (
            <button
              onClick={() => setShowAll(s => !s)}
              className="w-full px-5 py-2.5 text-[12px] text-text-dim hover:text-text-body hover:bg-bg-hover transition-colors text-center"
            >
              {showAll ? 'Show less' : `Show all ${countries.length} countries`}
            </button>
          )}
        </>
      )}

      {countries.length === 0 && (
        <div className="px-5 py-8 flex flex-col items-center justify-center gap-2">
          <Globe size={24} className="text-text-dim" />
          <p className="text-text-dim text-[12px]">No country data yet</p>
          <Link href="/integrations" className="text-accent text-[12px] hover:underline">
            Connect a platform
          </Link>
        </div>
      )}
    </div>
  );
}
