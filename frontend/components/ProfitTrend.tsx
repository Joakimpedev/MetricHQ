'use client';

import { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface DataPoint {
  date: string;
  spend: number;
  revenue: number;
  profit: number;
  purchases: number;
}

interface MergedPoint {
  date: string;
  profit: number;
  prevProfit?: number;
  prevDate?: string;
}

interface ProfitTrendProps {
  data: DataPoint[];
  prevData?: DataPoint[];
  isSingleDay?: boolean;
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

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltip(props: any) {
  const { active, payload, label } = props || {};
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  const profit = typeof point.profit === 'number' ? point.profit : null;
  const prevProfit = typeof point.prevProfit === 'number' ? point.prevProfit : null;
  const prevDate = typeof point.prevDate === 'string' ? point.prevDate : null;
  const dateLabel = typeof label === 'string' ? label : '';

  return (
    <div className="bg-bg-elevated border border-border-dim rounded-lg px-3 py-2 shadow-lg">
      <p className="text-[11px] text-text-dim">{dateLabel ? formatDate(dateLabel) : ''}</p>
      {profit !== null && (
        <p className={`text-[13px] font-semibold ${profit >= 0 ? 'text-success' : 'text-error'}`}>
          {profit >= 0 ? '+' : ''}${profit.toLocaleString()}
        </p>
      )}
      {prevProfit !== null && prevDate && (
        <div className="mt-1.5 pt-1.5 border-t border-border-dim/50">
          <p className="text-[10px] text-text-dim">{formatDate(prevDate)}</p>
          <p className="text-[12px] font-medium text-text-dim">
            {prevProfit >= 0 ? '+' : ''}${prevProfit.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

const ghostData = [
  { date: 'Jan 1', profit: 120 },
  { date: 'Jan 2', profit: 180 },
  { date: 'Jan 3', profit: 140 },
  { date: 'Jan 4', profit: 250 },
  { date: 'Jan 5', profit: 210 },
  { date: 'Jan 6', profit: 320 },
  { date: 'Jan 7', profit: 280 },
  { date: 'Jan 8', profit: 350 },
  { date: 'Jan 9', profit: 310 },
  { date: 'Jan 10', profit: 400 },
];

function GhostChart() {
  return (
    <div className="h-[240px] relative">
      {/* Faded, blurred chart */}
      <div className="absolute inset-0 opacity-[0.35] blur-[1.5px] pointer-events-none select-none">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={ghostData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="ghostGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
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
            <Area
              type="monotone"
              dataKey="profit"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#ghostGradient)"
              isAnimationActive={true}
              animationDuration={2000}
              animationEasing="ease-in-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {/* Overlay message */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <p className="text-text-dim text-[12px] font-medium bg-bg-surface/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-border-dim/50">
          Choose a date range with at least two days
        </p>
      </div>
    </div>
  );
}

export default function ProfitTrend({ data, prevData, isSingleDay }: ProfitTrendProps) {
  // Merge current and previous period data by index (day 1 → day 1, etc.)
  const merged = useMemo<MergedPoint[]>(() => {
    return data.map((point, i) => ({
      date: point.date,
      profit: point.profit,
      prevProfit: prevData?.[i]?.profit,
      prevDate: prevData?.[i]?.date,
    }));
  }, [data, prevData]);

  const hasPrev = prevData && prevData.length > 0;

  return (
    <div className="bg-bg-surface rounded-xl border border-border-dim p-5">
      <h3 className="text-[13px] font-medium text-text-heading mb-4">Profit Trend</h3>

      {isSingleDay || data.length < 2 ? (
        <GhostChart />
      ) : (
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={merged} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
              {/* Ghost line: previous period */}
              {hasPrev && (
                <Area
                  type="monotone"
                  dataKey="prevProfit"
                  stroke="var(--text-dim)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  fill="none"
                  dot={false}
                  activeDot={false}
                />
              )}
              {/* Primary: current period */}
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
      )}
    </div>
  );
}
