'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useCurrency } from '../lib/currency';

interface Country {
  code: string;
  name: string;
  spend: number;
  revenue: number;
  profit: number;
  roas: number;
  purchases: number;
}

interface CountryCampaign {
  platform: string;
  campaign: string;
  spend: number;
  revenue: number;
  impressions: number;
  clicks: number;
  purchases: number;
}

interface CountryBreakdownProps {
  countries: Country[];
  unattributedSpend?: number;
  countryCampaigns?: Record<string, CountryCampaign[]>;
}

type SortKey = 'spend' | 'purchases' | 'profit' | 'cpa';
type SortDir = 'asc' | 'desc';

const INITIAL_SHOW = 5;

const PLATFORM_LABELS: Record<string, string> = {
  google_ads: 'Google Ads',
  meta: 'Meta',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
};

// Not used for colored bars anymore — removed brand colors in favor of theme

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

function CountryTooltip({ country, campaigns, onClose, fmt }: {
  country: Country;
  campaigns: CountryCampaign[];
  onClose: () => void;
  fmt: (n: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // Platform spend + revenue breakdown
  const platformSpend: Record<string, number> = {};
  const platformRevenue: Record<string, number> = {};
  for (const c of campaigns) {
    platformSpend[c.platform] = (platformSpend[c.platform] || 0) + c.spend;
    platformRevenue[c.platform] = (platformRevenue[c.platform] || 0) + c.revenue;
  }
  const totalCampaignSpend = Object.values(platformSpend).reduce((s, v) => s + v, 0);

  // Sort campaigns by spend desc
  const sortedCampaigns = [...campaigns].sort((a, b) => b.spend - a.spend);

  return (
    <div
      ref={ref}
      className="absolute left-0 right-0 z-30 mx-3 mt-0.5 bg-bg-elevated border border-border-dim rounded-lg shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-dim/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CountryFlag code={country.code} />
          <span className="text-[13px] font-semibold text-text-heading">{country.name}</span>
        </div>
        <span className={`text-[12px] font-semibold ${country.profit >= 0 ? 'text-success' : 'text-error'}`}>
          {country.profit >= 0 ? '+' : ''}{fmt(country.profit)} profit
        </span>
      </div>

      {/* Platform breakdown with campaigns nested under each */}
      {totalCampaignSpend > 0 && (
        <div className="px-4 pt-3 pb-3">
          <div className="space-y-3">
            {Object.entries(platformSpend)
              .sort(([, a], [, b]) => b - a)
              .map(([plat, spend]) => {
                const rev = platformRevenue[plat] || 0;
                const barPct = totalCampaignSpend > 0 ? (spend / totalCampaignSpend) * 100 : 0;
                const platCampaigns = campaigns
                  .filter(c => c.platform === plat)
                  .sort((a, b) => b.spend - a.spend);
                return (
                  <div key={plat}>
                    {/* Platform header + bar */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-text-heading">{PLATFORM_LABELS[plat] || plat}</span>
                      <span className="text-[10px] text-text-dim">
                        {fmt(spend)} spent
                        {rev > 0 && <span className="ml-2">{fmt(rev)} rev</span>}
                      </span>
                    </div>
                    <div className="h-1.5 bg-bg-body rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full rounded-full bg-accent/40 transition-all"
                        style={{ width: `${Math.max(barPct, 4)}%` }}
                      />
                    </div>
                    {/* Campaigns under this platform */}
                    {platCampaigns.length > 0 && (
                      <div className="ml-2 space-y-0">
                        {platCampaigns.slice(0, 3).map((c, i) => (
                          <div key={`${c.campaign}-${i}`} className="flex items-center justify-between py-1 border-b border-border-dim/20 last:border-0">
                            <span className="text-[10px] text-text-dim truncate flex-1 min-w-0 pr-2">{c.campaign}</span>
                            <span className="text-[10px] text-text-body font-medium shrink-0">{fmt(c.spend)}</span>
                          </div>
                        ))}
                        {platCampaigns.length > 3 && (
                          <div className="text-[9px] text-text-dim/80 pt-0.5">+{platCampaigns.length - 3} more</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="px-4 py-2.5 bg-bg-body/50 border-t border-border-dim/40 flex gap-4">
        <div>
          <div className="text-[10px] text-text-dim">ROAS</div>
          <div className="text-[12px] font-semibold text-text-heading">{country.roas.toFixed(1)}x</div>
        </div>
        <div>
          <div className="text-[10px] text-text-dim">Revenue</div>
          <div className="text-[12px] font-semibold text-text-heading">{fmt(country.revenue)}</div>
        </div>
        <div>
          <div className="text-[10px] text-text-dim">CPA</div>
          <div className="text-[12px] font-semibold text-text-heading">
            {country.purchases > 0 ? fmt(country.spend / country.purchases) : '—'}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-text-dim">Conversions</div>
          <div className="text-[12px] font-semibold text-text-heading">{country.purchases}</div>
        </div>
      </div>
    </div>
  );
}

export default function CountryBreakdown({ countries, unattributedSpend = 0, countryCampaigns = {} }: CountryBreakdownProps) {
  const { formatCurrency: fmtCur } = useCurrency();
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showAll, setShowAll] = useState(false);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

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
    <div className="bg-bg-surface rounded-xl border border-border-dim overflow-visible">
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
              Conv.<SortIcon col="purchases" />
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
            const campaigns = countryCampaigns[c.code] || [];
            const isHovered = hoveredCountry === c.code;
            return (
              <div key={c.code} className="relative">
                <div
                  className={`grid grid-cols-[1fr_5rem_4.5rem_5.5rem_4.5rem] gap-2 px-5 py-3 border-b border-border-dim/40 last:border-0 transition-colors items-center cursor-pointer ${isHovered ? 'bg-bg-hover' : 'hover:bg-bg-hover'}`}
                  onClick={() => setHoveredCountry(isHovered ? null : c.code)}
                  onMouseEnter={() => setHoveredCountry(c.code)}
                  onMouseLeave={() => setHoveredCountry(null)}
                >
                  <div className="flex items-center gap-2.5">
                    <CountryFlag code={c.code} />
                    <span className="text-[13px] font-medium text-text-heading">{c.name}</span>
                    {campaigns.length > 0 && (
                      <span className="text-[10px] text-text-dim/70">
                        {campaigns.length} {campaigns.length === 1 ? 'campaign' : 'campaigns'}
                      </span>
                    )}
                  </div>
                  <span className="text-[12px] text-text-body text-right">{fmtCur(c.spend)}</span>
                  <span className="text-[12px] text-text-body text-right">{c.purchases.toLocaleString()}</span>
                  <span className={`text-[12px] font-semibold text-right ${c.profit >= 0 ? 'text-success' : 'text-error'}`}>
                    {c.profit >= 0 ? '+' : ''}{fmtCur(c.profit)}
                  </span>
                  <span className="text-[12px] text-text-body text-right">
                    {cpa > 0 ? fmtCur(cpa) : '—'}
                  </span>
                </div>
                {isHovered && campaigns.length > 0 && (
                  <CountryTooltip
                    country={c}
                    campaigns={campaigns}
                    onClose={() => setHoveredCountry(null)}
                    fmt={fmtCur}
                  />
                )}
              </div>
            );
          })}

          {/* Unattributed spend row (e.g. LinkedIn doesn't report by country) */}
          {unattributedSpend > 0 && (
            <div className="grid grid-cols-[1fr_5rem_4.5rem_5.5rem_4.5rem] gap-2 px-5 py-3 border-b border-border-dim/40 last:border-0 bg-bg-elevated/50 items-center">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-3.5 rounded-[2px] bg-text-dim/15 flex items-center justify-center text-[8px] text-text-dim shrink-0">?</span>
                <span className="text-[13px] font-medium text-text-dim">Unattributed</span>
                <span className="text-[10px] text-text-dim/80" title="LinkedIn Ads does not report spend by country">LinkedIn</span>
              </div>
              <span className="text-[12px] text-text-dim text-right">{fmtCur(unattributedSpend)}</span>
              <span className="text-[12px] text-text-dim text-right">—</span>
              <span className="text-[12px] text-text-dim text-right">—</span>
              <span className="text-[12px] text-text-dim text-right">—</span>
            </div>
          )}

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
        <div className="px-5 py-8 text-center text-text-dim text-[12px]">
          No country data yet.
        </div>
      )}
    </div>
  );
}
