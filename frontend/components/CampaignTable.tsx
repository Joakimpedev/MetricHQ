'use client';

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Check, Minus, BarChart3, Lock } from 'lucide-react';
import Link from 'next/link';

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
  gated?: boolean;
  onCampaignClick?: (platform: string, index: number) => void;
}

type SortKey = 'spend' | 'revenue' | 'profit' | 'purchases' | 'cpa';

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: 'TikTok Ads',
  meta: 'Meta Ads',
  google_ads: 'Google Ads',
  linkedin: 'LinkedIn Ads',
};
type SortDir = 'asc' | 'desc';

export default function CampaignTable({ platform, totalSpend, campaigns, gated, onCampaignClick }: CampaignTableProps) {
  const label = PLATFORM_LABELS[platform] || platform;
  const hasRevenue = campaigns.some(c => (c.revenue || 0) > 0);
  const hasAttribution = campaigns.some(c => c.attributed !== undefined);
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

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

  const hasPurchases = campaigns.some(c => (c.purchases || 0) > 0);
  // Column order: Campaign | [UTM] | Spend | [Conv] | [Revenue | Profit | CPA]
  const colDefs: string[] = ['1fr'];
  if (hasAttribution) colDefs.push('2.5rem');
  colDefs.push('5rem');
  if (hasPurchases) colDefs.push('4rem');
  if (hasRevenue) colDefs.push('5rem', '5rem', '4.5rem');
  const gridTemplate = colDefs.join(' ');

  return (
    <div className="bg-bg-surface rounded-xl border border-border-dim overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-dim">
        <h3 className="text-[13px] font-medium text-text-heading">{label}</h3>
      </div>

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
            {hasPurchases && (
              <button onClick={() => handleSort('purchases')} className={`${headerClass} text-right border-l border-border-dim/40 px-2 ${sortKey === 'purchases' ? 'text-text-body' : 'text-text-dim'}`}>
                Conv.<SortIcon col="purchases" />
              </button>
            )}
            {hasRevenue && (
              <>
                <button onClick={() => handleSort('revenue')} className={`${headerClass} text-right border-l border-border-dim/40 px-2 ${sortKey === 'revenue' ? 'text-text-body' : 'text-text-dim'}`}>
                  Revenue<SortIcon col="revenue" />
                </button>
                <button onClick={() => handleSort('profit')} className={`${headerClass} text-right border-l border-border-dim/40 px-2 ${sortKey === 'profit' ? 'text-text-body' : 'text-text-dim'}`}>
                  Profit<SortIcon col="profit" />
                </button>
                <button onClick={() => handleSort('cpa')} className={`${headerClass} text-right border-l border-border-dim/40 px-2 ${sortKey === 'cpa' ? 'text-text-body' : 'text-text-dim'}`}>
                  CPA<SortIcon col="cpa" />
                </button>
              </>
            )}
          </div>

          {/* Rows */}
          {sorted.map((c, i) => {
            const name = c.campaignName || c.campaignId || `Campaign ${i + 1}`;

            return (
              <div
                key={name + i}
                onClick={() => onCampaignClick?.(platform, c._origIndex)}
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
                {hasPurchases && (
                  <span className="text-[12px] text-text-body text-right border-l border-border-dim/40 px-2">{(c.purchases || 0).toLocaleString()}</span>
                )}
                {hasRevenue && (
                  <>
                    <span className="text-[12px] text-text-body text-right border-l border-border-dim/40 px-2">${(c.revenue || 0).toLocaleString()}</span>
                    <span className={`text-[12px] text-right font-medium border-l border-border-dim/40 px-2 ${(c.profit || 0) >= 0 ? 'text-success' : 'text-error'}`}>
                      ${(c.profit || 0).toLocaleString()}
                    </span>
                    <span className="text-[12px] text-text-body text-right border-l border-border-dim/40 px-2">
                      {(c.purchases || 0) > 0 ? `$${Math.round(c.spend / (c.purchases || 1)).toLocaleString()}` : '—'}
                    </span>
                  </>
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
