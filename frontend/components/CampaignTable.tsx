'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronUp, ChevronDown, Check, Minus, BarChart3, Lock, X, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useCurrency } from '../lib/currency';

interface Campaign {
  campaignId?: string;
  campaignName?: string;
  spend: number;
  impressions: number;
  clicks: number;
  revenue?: number;
  purchases?: number;
  profit?: number;
  attributed?: boolean;
}

interface CountryCampaignEntry {
  campaign: string;
  platform: string;
  spend: number;
  revenue: number;
}

interface CountryInfo {
  code: string;
  name: string;
}

interface CampaignTableProps {
  platform: string;
  totalSpend: number;
  campaigns: Campaign[];
  gated?: boolean;
  onCampaignClick?: (platform: string, index: number) => void;
  showUtmBanner?: boolean;
  countryCampaigns?: Record<string, CountryCampaignEntry[]>;
  countries?: CountryInfo[];
}

type SortKey = 'spend' | 'revenue' | 'profit' | 'purchases' | 'cpa';

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: 'TikTok Ads',
  meta: 'Meta Ads',
  google_ads: 'Google Ads',
  linkedin: 'LinkedIn Ads',
};
type SortDir = 'asc' | 'desc';

const PLATFORM_UTM_URLS: Record<string, string> = {
  google_ads: 'https://support.google.com/google-ads/answer/6305348',
  meta: 'https://www.facebook.com/business/help/1016122818401732',
  tiktok: 'https://ads.tiktok.com/help/article/track-offsite-web-events-with-utm-parameters',
  linkedin: 'https://www.linkedin.com/help/lms/answer/a5968064',
};

function CampaignFlag({ code }: { code: string }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w40/${code.toLowerCase()}.png 1x, https://flagcdn.com/w80/${code.toLowerCase()}.png 2x`}
      alt={code}
      className="w-4 h-3 object-cover rounded-[2px] shrink-0"
      loading="lazy"
    />
  );
}

function CampaignTooltip({ campaign, platform, countryCampaigns, countries, onClose, fmt }: {
  campaign: Campaign;
  platform: string;
  countryCampaigns: Record<string, CountryCampaignEntry[]>;
  countries: CountryInfo[];
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

  const name = campaign.campaignName || campaign.campaignId || 'Campaign';
  const profit = campaign.profit || 0;
  const impressions = campaign.impressions || 0;
  const clicks = campaign.clicks || 0;
  const ctr = impressions > 0 ? (clicks / impressions * 100) : 0;
  const isAttributed = campaign.attributed !== false;
  const roas = isAttributed && (campaign.revenue || 0) > 0 && campaign.spend > 0
    ? (campaign.revenue || 0) / campaign.spend : 0;

  // Find countries where this campaign runs
  const campaignCountries: { code: string; name: string; spend: number; revenue: number }[] = [];
  for (const [code, entries] of Object.entries(countryCampaigns)) {
    for (const entry of entries) {
      if (entry.campaign === name && entry.platform === platform) {
        const countryInfo = countries.find(c => c.code === code);
        campaignCountries.push({
          code,
          name: countryInfo?.name || code,
          spend: entry.spend,
          revenue: entry.revenue,
        });
      }
    }
  }
  campaignCountries.sort((a, b) => b.spend - a.spend);

  return (
    <div
      ref={ref}
      className="absolute left-0 right-0 z-30 mx-3 mt-0.5 bg-bg-elevated border border-border-dim rounded-lg shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-dim/60 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-text-heading truncate">{name}</span>
        <span className={`text-[12px] font-semibold shrink-0 ${profit >= 0 ? 'text-success' : 'text-error'}`}>
          {profit >= 0 ? '+' : ''}{fmt(profit)} profit
        </span>
      </div>

      {/* Stats grid */}
      <div className="px-4 py-2.5 flex gap-4 border-b border-border-dim/40">
        <div>
          <div className="text-[10px] text-text-dim">Impressions</div>
          <div className="text-[12px] font-semibold text-text-heading">{impressions.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] text-text-dim">Clicks</div>
          <div className="text-[12px] font-semibold text-text-heading">{clicks.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] text-text-dim">CTR</div>
          <div className="text-[12px] font-semibold text-text-heading">{ctr.toFixed(1)}%</div>
        </div>
        {isAttributed && roas > 0 && (
          <div>
            <div className="text-[10px] text-text-dim">ROAS</div>
            <div className="text-[12px] font-semibold text-text-heading">{roas.toFixed(1)}x</div>
          </div>
        )}
      </div>

      {/* Country breakdown */}
      {campaignCountries.length > 0 && (
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-text-dim uppercase tracking-wider">Countries</span>
            <div className="flex gap-3">
              <span className="text-[9px] uppercase tracking-wider text-text-dim/60 w-[3.5rem] text-right">Rev</span>
              <span className="text-[9px] uppercase tracking-wider text-text-dim/60 w-[3.5rem] text-right">Spend</span>
              <span className="text-[9px] uppercase tracking-wider text-text-dim/60 w-[3.5rem] text-right">Profit</span>
            </div>
          </div>
          <div className="space-y-0">
            {campaignCountries.slice(0, 5).map(c => {
              const cProfit = c.revenue - c.spend;
              return (
                <div key={c.code} className="flex items-center justify-between py-1 border-b border-border-dim/20 last:border-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CampaignFlag code={c.code} />
                    <span className="text-[10px] text-text-body truncate">{c.name}</span>
                  </div>
                  <div className="flex gap-3 text-[10px] shrink-0 ml-2">
                    <span className="w-[3.5rem] text-right text-text-dim">{isAttributed && c.revenue > 0 ? fmt(c.revenue) : '—'}</span>
                    <span className="w-[3.5rem] text-right text-error">{fmt(c.spend)}</span>
                    <span className={`w-[3.5rem] text-right ${isAttributed && c.revenue > 0 ? (cProfit >= 0 ? 'text-success' : 'text-error') : 'text-text-dim'}`}>
                      {isAttributed && c.revenue > 0 ? `${cProfit >= 0 ? '+' : ''}${fmt(cProfit)}` : '—'}
                    </span>
                  </div>
                </div>
              );
            })}
            {campaignCountries.length > 5 && (
              <div className="text-[9px] text-text-dim/80 pt-0.5">+{campaignCountries.length - 5} more</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CampaignTable({ platform, totalSpend, campaigns, gated, onCampaignClick, showUtmBanner, countryCampaigns = {}, countries = [] }: CampaignTableProps) {
  const { formatCurrency: fmtCur } = useCurrency();
  const label = PLATFORM_LABELS[platform] || platform;
  const hasAttribution = campaigns.some(c => c.attributed !== undefined);
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [hoveredCampaign, setHoveredCampaign] = useState<number | null>(null);

  const dismissKey = `metrichq-utm-dismissed-${platform}`;
  const [utmDismissed, setUtmDismissed] = useState(true);
  useEffect(() => {
    setUtmDismissed(localStorage.getItem(dismissKey) === '1');
  }, [dismissKey]);
  const handleUtmDismiss = () => {
    localStorage.setItem(dismissKey, '1');
    setUtmDismissed(true);
  };
  const utmVisible = showUtmBanner && !utmDismissed;

  const sorted = useMemo(() => {
    const arr = campaigns.map((c, i) => ({ ...c, _origIndex: i }));
    arr.sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === 'cpa') {
        av = (a.purchases || 0) > 0 ? a.spend / (a.purchases || 1) : Infinity;
        bv = (b.purchases || 0) > 0 ? b.spend / (b.purchases || 1) : Infinity;
      } else if (sortKey === 'revenue') {
        av = a.revenue || 0;
        bv = b.revenue || 0;
      } else if (sortKey === 'profit') {
        av = a.profit || 0;
        bv = b.profit || 0;
      } else if (sortKey === 'purchases') {
        av = a.purchases || 0;
        bv = b.purchases || 0;
      } else {
        av = a[sortKey];
        bv = b[sortKey];
      }
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return arr;
  }, [campaigns, sortKey, sortDir]);

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

  // Column order: Campaign | [UTM] | Spend | Conv | Revenue | Profit | CPA
  const colDefs: string[] = ['1fr'];
  if (hasAttribution) colDefs.push('2.5rem');
  colDefs.push('5rem', '4rem', '5rem', '5rem', '4.5rem');
  const gridTemplate = colDefs.join(' ');

  return (
    <div className="bg-bg-surface rounded-xl border border-border-dim overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-dim">
        <h3 className="text-[13px] font-medium text-text-heading">{label}</h3>
      </div>

      {/* UTM banner */}
      {utmVisible && (
        <div className="mx-4 mt-3 mb-1 bg-warning/10 border border-warning/25 rounded-lg px-3 py-2.5 flex items-start gap-2.5 relative">
          <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[11px] text-text-body leading-snug">
              Revenue isn&apos;t linked to {label} campaigns.{' '}
              <a
                href={PLATFORM_UTM_URLS[platform] || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-warning font-medium underline underline-offset-2 hover:text-warning/80"
              >
                Set up UTM tracking
              </a>
            </p>
          </div>
          <button
            onClick={handleUtmDismiss}
            className="text-warning/60 hover:text-warning transition-colors shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {gated && (
        <div className="px-5 py-8 flex flex-col items-center justify-center gap-2">
          <Lock size={24} className="text-text-dim" />
          <p className="text-text-dim text-[12px] text-center">Campaign P&L is available on Growth and Pro plans.</p>
          <Link href="/pricing" className="text-accent hover:text-accent-hover text-[12px] font-medium transition-colors">
            Upgrade to see campaign breakdown
          </Link>
        </div>
      )}

      {!gated && campaigns.length > 0 && (
        <>
          {/* Column headers */}
          <div className="grid px-5 py-2 border-b border-border-dim" style={{ gridTemplateColumns: gridTemplate }}>
            <span className="text-[10px] uppercase tracking-wider text-text-dim pr-2">Campaign</span>
            {hasAttribution && (
              <span className="text-[10px] uppercase tracking-wider text-text-dim text-center border-l border-border-dim/40 px-2">UTM</span>
            )}
            <button onClick={() => handleSort('spend')} className={`${headerClass} text-right border-l border-border-dim/40 px-2 ${sortKey === 'spend' ? 'text-text-body' : 'text-text-dim'}`}>
              Spend<SortIcon col="spend" />
            </button>
            <button onClick={() => handleSort('purchases')} className={`${headerClass} text-right border-l border-border-dim/40 px-2 ${sortKey === 'purchases' ? 'text-text-body' : 'text-text-dim'}`}>
              Conv.<SortIcon col="purchases" />
            </button>
            <button onClick={() => handleSort('revenue')} className={`${headerClass} text-right border-l border-border-dim/40 px-2 ${sortKey === 'revenue' ? 'text-text-body' : 'text-text-dim'}`}>
              Revenue<SortIcon col="revenue" />
            </button>
            <button onClick={() => handleSort('profit')} className={`${headerClass} text-right border-l border-border-dim/40 px-2 ${sortKey === 'profit' ? 'text-text-body' : 'text-text-dim'}`}>
              Profit<SortIcon col="profit" />
            </button>
            <button onClick={() => handleSort('cpa')} className={`${headerClass} text-right border-l border-border-dim/40 px-2 ${sortKey === 'cpa' ? 'text-text-body' : 'text-text-dim'}`}>
              CPA<SortIcon col="cpa" />
            </button>
          </div>

          {/* Rows */}
          {sorted.map((c, i) => {
            const name = c.campaignName || c.campaignId || `Campaign ${i + 1}`;
            const isHovered = hoveredCampaign === i;

            return (
              <div key={name + i} className="relative">
                <div
                  onClick={() => { onCampaignClick?.(platform, c._origIndex); setHoveredCampaign(isHovered ? null : i); }}
                  onMouseEnter={() => setHoveredCampaign(i)}
                  onMouseLeave={() => setHoveredCampaign(null)}
                  className={`grid px-5 py-3 border-b border-border-dim/40 last:border-0 transition-colors items-center cursor-pointer ${isHovered ? 'bg-bg-hover' : 'hover:bg-bg-hover'}`}
                  style={{ gridTemplateColumns: gridTemplate }}
                >
                  <span className="text-[13px] font-medium text-text-heading truncate pr-2">{name}</span>
                  {hasAttribution && (
                    <span className="flex items-center justify-center border-l border-border-dim/40 px-2">
                      {c.attributed ? (
                        <Check size={13} className="text-success" />
                      ) : (
                        <Minus size={13} className="text-text-dim" />
                      )}
                    </span>
                  )}
                  <span className="text-[12px] text-text-body text-right border-l border-border-dim/40 px-2">{fmtCur(c.spend)}</span>
                  <span className="text-[12px] text-text-body text-right border-l border-border-dim/40 px-2">{(c.purchases || 0).toLocaleString()}</span>
                  <span className="text-[12px] text-text-body text-right border-l border-border-dim/40 px-2">{fmtCur(c.revenue || 0)}</span>
                  <span className={`text-[12px] text-right font-medium border-l border-border-dim/40 px-2 ${(c.profit || 0) >= 0 ? 'text-success' : 'text-error'}`}>
                    {fmtCur(c.profit || 0)}
                  </span>
                  <span className="text-[12px] text-text-body text-right border-l border-border-dim/40 px-2">
                    {(c.purchases || 0) > 0 ? fmtCur(Math.round(c.spend / (c.purchases || 1))) : '—'}
                  </span>
                </div>
                {isHovered && (
                  <CampaignTooltip
                    campaign={c}
                    platform={platform}
                    countryCampaigns={countryCampaigns}
                    countries={countries}
                    onClose={() => setHoveredCampaign(null)}
                    fmt={fmtCur}
                  />
                )}
              </div>
            );
          })}
        </>
      )}

      {!gated && campaigns.length === 0 && (
        <div className="px-5 py-8 flex flex-col items-center justify-center gap-2">
          <BarChart3 size={24} className="text-text-dim" />
          <p className="text-text-dim text-[12px]">No campaign data</p>
        </div>
      )}
    </div>
  );
}
