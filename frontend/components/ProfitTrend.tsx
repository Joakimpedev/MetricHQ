'use client';

import { useMemo, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

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

interface SummaryData {
  totalProfit: number;
  totalRevenue: number;
  totalSpend: number;
}

interface ProfitTrendProps {
  data: DataPoint[];
  prevData?: DataPoint[];
  isSingleDay?: boolean;
  summary?: SummaryData;
  compSummary?: SummaryData;
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

function InlineBadge({ current, previous, invert }: { current: number; previous: number; invert?: boolean }) {
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
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
      isGood ? 'text-success' : 'text-error'
    }`}>
      <Icon size={11} />
      {isPositive ? '+' : ''}{pctChange.toFixed(1)}%
    </span>
  );
}

export default function ProfitTrend({ data, prevData, isSingleDay, summary, compSummary }: ProfitTrendProps) {
  const [showProfit, setShowProfit] = useState(true);

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
      {/* Inline metrics row */}
      {summary && (
        <div className="flex items-start gap-6 md:gap-8 mb-5 flex-wrap">
          {/* Profit — with checkbox */}
          <button
            type="button"
            onClick={() => setShowProfit(prev => !prev)}
            className="flex items-start gap-2.5 text-left group cursor-pointer"
          >
            <span className={`mt-1.5 w-[14px] h-[14px] rounded-[4px] border-2 flex items-center justify-center shrink-0 transition-colors ${
              showProfit
                ? 'bg-accent border-accent'
                : 'border-border-dim bg-transparent'
            }`}>
              {showProfit && (
                <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                  <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-text-dim">Profit</span>
              <div className="flex items-center gap-2">
                <span className={`text-[22px] font-bold tracking-tight leading-none ${summary.totalProfit >= 0 ? 'text-success' : 'text-error'}`}>
                  {summary.totalProfit >= 0 ? '+' : ''}${summary.totalProfit.toLocaleString()}
                </span>
                {compSummary && <InlineBadge current={summary.totalProfit} previous={compSummary.totalProfit} />}
              </div>
            </div>
          </button>

          {/* Revenue — no checkbox */}
          <div className="flex items-start gap-2.5">
            <span className="mt-1.5 w-[14px] h-[14px] rounded-full bg-text-dim/20 shrink-0" />
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-text-dim">Revenue</span>
              <div className="flex items-center gap-2">
                <span className="text-[22px] font-bold tracking-tight leading-none text-text-heading">
                  ${summary.totalRevenue.toLocaleString()}
                </span>
                {compSummary && <InlineBadge current={summary.totalRevenue} previous={compSummary.totalRevenue} />}
              </div>
            </div>
          </div>

          {/* Ad Spend — no checkbox */}
          <div className="flex items-start gap-2.5">
            <span className="mt-1.5 w-[14px] h-[14px] rounded-full bg-text-dim/20 shrink-0" />
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-text-dim">Ad Spend</span>
              <div className="flex items-center gap-2">
                <span className="text-[22px] font-bold tracking-tight leading-none text-text-heading">
                  ${summary.totalSpend.toLocaleString()}
                </span>
                {compSummary && <InlineBadge current={summary.totalSpend} previous={compSummary.totalSpend} invert />}
              </div>
            </div>
          </div>
        </div>
      )}

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
              {hasPrev && showProfit && (
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
              {showProfit && (
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#profitGradient)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
