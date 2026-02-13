'use client';

function fmt(n: number): string {
  return '$' + Math.abs(n).toLocaleString();
}

interface PlatformSummaryBoxProps {
  spend: number;
  revenue: number;
  profit: number;
}

export function PlatformSummaryBox({ spend, revenue, profit }: PlatformSummaryBoxProps) {
  return (
    <div className="bg-bg-surface rounded-xl border border-border-dim p-4 space-y-2 self-start">
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
  );
}

interface UnattributedBoxProps {
  revenue: number;
}

export function UnattributedBox({ revenue }: UnattributedBoxProps) {
  return (
    <div className="bg-bg-surface rounded-xl border border-border-dim p-4 space-y-2">
      <p className="text-[13px] font-semibold text-text-heading">Unattributed Revenue</p>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-text-dim">Revenue</span>
        <span className="text-[13px] font-medium text-text-heading">{fmt(revenue)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-text-dim">Source</span>
        <span className="text-[11px] text-text-dim">No UTM match</span>
      </div>
    </div>
  );
}
