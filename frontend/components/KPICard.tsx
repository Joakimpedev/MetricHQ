import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  valueColor?: string;
  previousValue?: number;
  currentValue?: number;
  invertComparison?: boolean;
}

function ComparisonBadge({ current, previous, invert }: { current: number; previous: number; invert?: boolean }) {
  if (previous === 0 && current === 0) return null;

  let pctChange: number;
  if (previous === 0) {
    pctChange = current > 0 ? 100 : -100;
  } else {
    pctChange = ((current - previous) / Math.abs(previous)) * 100;
  }

  const isPositive = pctChange >= 0;
  const isGood = invert ? !isPositive : isPositive;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
      isGood ? 'text-success' : 'text-error'
    }`}>
      <Icon size={12} />
      {isPositive ? '+' : ''}{pctChange.toFixed(1)}%
    </span>
  );
}

export default function KPICard({ title, value, subtitle, valueColor = 'text-text-heading', previousValue, currentValue, invertComparison }: KPICardProps) {
  return (
    <div className="bg-bg-surface rounded-xl p-5 border border-border-dim">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-text-dim">
          {title}
        </span>
        {previousValue !== undefined && currentValue !== undefined && (
          <ComparisonBadge current={currentValue} previous={previousValue} invert={invertComparison} />
        )}
      </div>
      <p className={`text-[28px] font-bold tracking-tight mt-1.5 leading-none ${valueColor}`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-[12px] text-text-dim mt-1.5">{subtitle}</p>
      )}
    </div>
  );
}
