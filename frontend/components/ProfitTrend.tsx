'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface DataPoint {
  date: string;
  spend: number;
  revenue: number;
  profit: number;
  purchases: number;
}

interface ProfitTrendProps {
  data: DataPoint[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDollar(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value}`;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const profit = payload[0].value;
  return (
    <div className="bg-bg-elevated border border-border-dim rounded-lg px-3 py-2 shadow-lg">
      <p className="text-[11px] text-text-dim">{label ? formatDate(label) : ''}</p>
      <p className={`text-[13px] font-semibold ${profit >= 0 ? 'text-success' : 'text-error'}`}>
        {profit >= 0 ? '+' : ''}${profit.toLocaleString()}
      </p>
    </div>
  );
}

export default function ProfitTrend({ data }: ProfitTrendProps) {
  if (!data.length) {
    return (
      <div className="bg-bg-surface rounded-xl border border-border-dim p-5">
        <h3 className="text-[13px] font-medium text-text-heading mb-4">Profit Trend</h3>
        <div className="h-[240px] flex items-center justify-center text-text-dim text-[12px]">
          No trend data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-surface rounded-xl border border-border-dim p-5">
      <h3 className="text-[13px] font-medium text-text-heading mb-4">Profit Trend</h3>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-dim)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11, fill: 'var(--text-dim)' }}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              tickFormatter={formatDollar}
              tick={{ fontSize: 11, fill: 'var(--text-dim)' }}
              axisLine={false}
              tickLine={false}
              tickMargin={4}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="profit"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#profitGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
