'use client';

interface PlatformSummaryItem {
  label: string;
  spend: number;
  revenue: number;
  profit: number;
}

interface PlatformSummaryProps {
  platforms: PlatformSummaryItem[];
  unattributedRevenue?: number;
}

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: 'TikTok Ads',
  meta: 'Meta Ads',
  google_ads: 'Google Ads',
  linkedin: 'LinkedIn Ads',
};

function fmt(n: number): string {
  return '$' + Math.abs(n).toLocaleString();
}

function Box({ label, spend, revenue, profit }: PlatformSummaryItem) {
  return (
    <div className="bg-bg-surface rounded-xl border border-border-dim p-4">
      <p className="text-[13px] font-semibold text-text-heading mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-dim">Spend</span>
          <span className="text-[13px] font-medium text-text-heading">{fmt(spend)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-dim">Revenue</span>
          <span className="text-[13px] font-medium text-text-heading">{fmt(revenue)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-dim">Profit</span>
          <span className={`text-[13px] font-semibold ${profit >= 0 ? 'text-success' : 'text-error'}`}>
            {profit >= 0 ? '+' : '-'}{fmt(profit)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PlatformSummary({ platforms, unattributedRevenue = 0 }: PlatformSummaryProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {platforms.map(p => (
        <Box key={p.label} {...p} />
      ))}
      {unattributedRevenue > 0 && (
        <div className="bg-bg-surface rounded-xl border border-border-dim p-4">
          <p className="text-[13px] font-semibold text-text-heading mb-2">Unattributed</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-dim">Revenue</span>
              <span className="text-[13px] font-medium text-text-heading">{fmt(unattributedRevenue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-dim">Source</span>
              <span className="text-[11px] text-text-dim">No UTM match</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
