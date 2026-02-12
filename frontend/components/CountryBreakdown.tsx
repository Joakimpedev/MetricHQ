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

export default function CountryBreakdown({ countries }: CountryBreakdownProps) {
  const maxSpend = Math.max(...countries.map(c => c.spend), 1);

  return (
    <div className="bg-bg-surface rounded-xl border border-border-dim overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-dim">
        <h3 className="text-[13px] font-medium text-text-heading">Countries</h3>
        {countries.length > 0 && (
          <span className="text-[11px] text-text-dim bg-bg-elevated px-2 py-0.5 rounded">
            {countries.length} {countries.length === 1 ? 'country' : 'countries'}
          </span>
        )}
      </div>
      <div>
        {countries.length > 0 && (
          <div className="flex items-center gap-4 px-5 py-2 border-b border-border-dim">
            <span className="w-28 shrink-0 text-[10px] uppercase tracking-wider text-text-dim">Country</span>
            <div className="flex-1" />
            <span className="text-[10px] uppercase tracking-wider text-text-dim w-20 text-right">Spend</span>
            <span className="text-[10px] uppercase tracking-wider text-text-dim w-20 text-right">Profit</span>
            <span className="text-[10px] uppercase tracking-wider text-text-dim w-10 text-right">ROAS</span>
          </div>
        )}
        {countries.map(c => {
          const barWidth = (c.spend / maxSpend) * 100;
          const roasColor =
            c.roas >= 2 ? 'bg-success-bg text-success' :
            c.roas >= 1 ? 'bg-warning-bg text-warning' :
            'bg-error-bg text-error';

          return (
            <div key={c.code} className="flex items-center gap-4 px-5 py-3.5 border-b border-border-dim/40 last:border-0 hover:bg-bg-hover transition-colors">
              <div className="w-28 shrink-0">
                <span className="text-[13px] font-medium text-text-heading">{c.name}</span>
                <span className="text-[10px] font-mono text-text-dim bg-bg-elevated px-1.5 py-0.5 rounded ml-1.5">{c.code}</span>
              </div>

              <div className="flex-1 h-1 bg-bg-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent/25 rounded-full"
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              <span className="text-[12px] text-text-body w-20 text-right">${c.spend.toLocaleString()}</span>

              <span className={`text-[12px] font-semibold w-20 text-right ${c.profit >= 0 ? 'text-success' : 'text-error'}`}>
                {c.profit >= 0 ? '+' : ''}${c.profit.toLocaleString()}
              </span>

              <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${roasColor}`}>
                {c.roas}x
              </span>
            </div>
          );
        })}
        {countries.length === 0 && (
          <div className="px-5 py-8 text-center text-text-dim text-[12px]">
            No country data yet. Connect your ad accounts and PostHog.
          </div>
        )}
      </div>
    </div>
  );
}
