'use client';

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Check, Minus } from 'lucide-react';

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

interface CampaignTableProps {
  platform: string;
  totalSpend: number;
  campaigns: Campaign[];
}

type SortKey = 'spend' | 'impressions' | 'clicks' | 'ctr' | 'revenue' | 'profit';

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: 'TikTok Ads',
  meta: 'Meta Ads',
  google_ads: 'Google Ads',
  linkedin: 'LinkedIn Ads',
};
type SortDir = 'asc' | 'desc';

function getCtr(c: Campaign): number {
  return c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
}

export default function CampaignTable({ platform, totalSpend, campaigns }: CampaignTableProps) {
  const label = PLATFORM_LABELS[platform] || platform;
  const hasRevenue = campaigns.some(c => (c.revenue || 0) > 0);
  const hasAttribution = campaigns.some(c => c.attributed !== undefined);
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    const arr = [...campaigns];
    arr.sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === 'ctr') {
        av = getCtr(a);
        bv = getCtr(b);
      } else if (sortKey === 'revenue') {
        av = a.revenue || 0;
        bv = b.revenue || 0;
      } else if (sortKey === 'profit') {
        av = a.profit || 0;
        bv = b.profit || 0;
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

  const colDefs: string[] = ['1fr'];
  if (hasAttribution) colDefs.push('2.5rem');
  colDefs.push('5rem', '5rem', '4.5rem', '4rem');
  if (hasRevenue) colDefs.push('5rem', '5rem');
  const gridTemplate = colDefs.join(' ');

  return (
    <div className="bg-bg-surface rounded-xl border border-border-dim overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-dim bg-accent-tint">
        <h3 className="text-[13px] font-medium text-text-heading">{label}</h3>
      </div>

      {campaigns.length > 0 && (
        <>
          {/* Column headers */}
          <div className="grid px-5 py-2 border-b border-border-dim" style={{ gridTemplateColumns: gridTemplate }}>
            <span className="text-[10px] uppercase tracking-wider text-text-dim pr-2">Campaign</span>
            {hasAttribution && (
              <span className="text-[10px] uppercase tracking-wider text-text-dim text-center border-l border-border-dim/40 px-2">Attr.</span>
            )}
            <button onClick={() => handleSort('spend')} className={`${headerClass} text-right border-l border-border-dim/40 px-2 ${sortKey === 'spend' ? 'text-text-body' : 'text-text-dim'}`}>
              Spend<SortIcon col="spend" />
            </button>
            <button onClick={() => handleSort('impressions')} className={`${headerClass} text-right border-l border-border-dim/40 px-2 ${sortKey === 'impressions' ? 'text-text-body' : 'text-text-dim'}`}>
              Impr.<SortIcon col="impressions" />
            </button>
            <button onClick={() => handleSort('clicks')} className={`${headerClass} text-right border-l border-border-dim/40 px-2 ${sortKey === 'clicks' ? 'text-text-body' : 'text-text-dim'}`}>
              Clicks<SortIcon col="clicks" />
            </button>
            <button onClick={() => handleSort('ctr')} className={`${headerClass} text-right border-l border-border-dim/40 px-2 ${sortKey === 'ctr' ? 'text-text-body' : 'text-text-dim'}`}>
              CTR<SortIcon col="ctr" />
            </button>
            {hasRevenue && (
              <>
                <button onClick={() => handleSort('revenue')} className={`${headerClass} text-right border-l border-border-dim/40 px-2 ${sortKey === 'revenue' ? 'text-text-body' : 'text-text-dim'}`}>
                  Revenue<SortIcon col="revenue" />
                </button>
                <button onClick={() => handleSort('profit')} className={`${headerClass} text-right border-l border-border-dim/40 px-2 ${sortKey === 'profit' ? 'text-text-body' : 'text-text-dim'}`}>
                  Profit<SortIcon col="profit" />
                </button>
              </>
            )}
          </div>

          {/* Rows */}
          {sorted.map((c, i) => {
            const name = c.campaignName || c.campaignId || `Campaign ${i + 1}`;
            const ctr = getCtr(c);

            return (
              <div
                key={name + i}
                className="grid px-5 py-3 border-b border-border-dim/40 last:border-0 hover:bg-bg-hover transition-colors items-center"
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
                <span className="text-[12px] text-text-body text-right border-l border-border-dim/40 px-2">${c.spend.toLocaleString()}</span>
                <span className="text-[12px] text-text-body text-right border-l border-border-dim/40 px-2">{c.impressions.toLocaleString()}</span>
                <span className="text-[12px] text-text-body text-right border-l border-border-dim/40 px-2">{c.clicks.toLocaleString()}</span>
                <span className="text-[12px] text-text-body text-right border-l border-border-dim/40 px-2">{ctr.toFixed(2)}%</span>
                {hasRevenue && (
                  <>
                    <span className="text-[12px] text-text-body text-right border-l border-border-dim/40 px-2">${(c.revenue || 0).toLocaleString()}</span>
                    <span className={`text-[12px] text-right font-medium border-l border-border-dim/40 px-2 ${(c.profit || 0) >= 0 ? 'text-success' : 'text-error'}`}>
                      ${(c.profit || 0).toLocaleString()}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </>
      )}

      {campaigns.length === 0 && (
        <div className="px-5 py-8 text-center text-text-dim text-[12px]">
          No campaign data available
        </div>
      )}
    </div>
  );
}
