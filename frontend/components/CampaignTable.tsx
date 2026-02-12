'use client';

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Campaign {
  campaignId?: string;
  campaignName?: string;
  spend: number;
  impressions: number;
  clicks: number;
}

interface CampaignTableProps {
  platform: string;
  totalSpend: number;
  campaigns: Campaign[];
}

type SortKey = 'spend' | 'impressions' | 'clicks' | 'ctr';
type SortDir = 'asc' | 'desc';

function getCtr(c: Campaign): number {
  return c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
}

export default function CampaignTable({ platform, totalSpend, campaigns }: CampaignTableProps) {
  const label = platform === 'tiktok' ? 'TikTok Ads' : platform === 'meta' ? 'Meta Ads' : platform;
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    const arr = [...campaigns];
    arr.sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === 'ctr') {
        av = getCtr(a);
        bv = getCtr(b);
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

  return (
    <div className="bg-bg-surface rounded-xl border border-border-dim overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-dim">
        <h3 className="text-[13px] font-medium text-text-heading">{label}</h3>
        <span className="text-[12px] font-semibold text-text-heading">
          ${totalSpend.toLocaleString()}
          <span className="text-text-dim font-normal ml-1">total spend</span>
        </span>
      </div>

      {campaigns.length > 0 && (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_5rem_5rem_4.5rem_4rem] gap-2 px-5 py-2 border-b border-border-dim">
            <span className="text-[10px] uppercase tracking-wider text-text-dim">Campaign</span>
            <button onClick={() => handleSort('spend')} className={`${headerClass} text-right ${sortKey === 'spend' ? 'text-text-body' : 'text-text-dim'}`}>
              Spend<SortIcon col="spend" />
            </button>
            <button onClick={() => handleSort('impressions')} className={`${headerClass} text-right ${sortKey === 'impressions' ? 'text-text-body' : 'text-text-dim'}`}>
              Impr.<SortIcon col="impressions" />
            </button>
            <button onClick={() => handleSort('clicks')} className={`${headerClass} text-right ${sortKey === 'clicks' ? 'text-text-body' : 'text-text-dim'}`}>
              Clicks<SortIcon col="clicks" />
            </button>
            <button onClick={() => handleSort('ctr')} className={`${headerClass} text-right ${sortKey === 'ctr' ? 'text-text-body' : 'text-text-dim'}`}>
              CTR<SortIcon col="ctr" />
            </button>
          </div>

          {/* Rows */}
          {sorted.map((c, i) => {
            const name = c.campaignName || c.campaignId || `Campaign ${i + 1}`;
            const ctr = getCtr(c);

            return (
              <div
                key={name + i}
                className="grid grid-cols-[1fr_5rem_5rem_4.5rem_4rem] gap-2 px-5 py-3 border-b border-border-dim/40 last:border-0 hover:bg-bg-hover transition-colors items-center"
              >
                <span className="text-[13px] font-medium text-text-heading truncate">{name}</span>
                <span className="text-[12px] text-text-body text-right">${c.spend.toLocaleString()}</span>
                <span className="text-[12px] text-text-body text-right">{c.impressions.toLocaleString()}</span>
                <span className="text-[12px] text-text-body text-right">{c.clicks.toLocaleString()}</span>
                <span className="text-[12px] text-text-body text-right">{ctr.toFixed(2)}%</span>
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
