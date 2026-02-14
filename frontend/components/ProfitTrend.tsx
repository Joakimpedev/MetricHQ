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

interface PlatformSummary {
  totalSpend: number;
  totalRevenue?: number;
}

interface ProfitTrendProps {
  data: DataPoint[];
  prevData?: DataPoint[];
  isSingleDay?: boolean;
  summary?: SummaryData;
  compSummary?: SummaryData;
  customCostsTotal?: number;
  compCustomCostsTotal?: number;
  platforms?: Record<string, PlatformSummary>;
}

const PLATFORM_LABELS: Record<string, string> = {
  google_ads: 'Google Ads',
  meta: 'Meta Ads',
  tiktok: 'TikTok Ads',
  linkedin: 'LinkedIn Ads',
};

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

function formatDollarCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) return `${value < 0 ? '-' : ''}$${(abs / 1000).toFixed(1)}k`;
  return `${value < 0 ? '-' : ''}$${abs.toLocaleString()}`;
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
    <div className="h-[360px] relative">
      <div className="absolute inset-0 opacity-[0.35] blur-[1.5px] pointer-events-none select-none">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={ghostData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="ghostGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dim)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} tickMargin={8} />
            <YAxis tickFormatter={formatDollar} tick={{ fontSize: 11, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} tickMargin={4} width={48} />
            <Area type="monotone" dataKey="profit" stroke="var(--accent)" strokeWidth={2} fill="url(#ghostGradient)" isAnimationActive={true} animationDuration={2000} animationEasing="ease-in-out" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
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

export default function ProfitTrend({ data, prevData, isSingleDay, summary, compSummary, customCostsTotal, compCustomCostsTotal, platforms }: ProfitTrendProps) {
  const [showProfit, setShowProfit] = useState(true);

  const merged = useMemo<MergedPoint[]>(() => {
    return data.map((point, i) => ({
      date: point.date,
      profit: point.profit,
      prevProfit: prevData?.[i]?.profit,
      prevDate: prevData?.[i]?.date,
    }));
  }, [data, prevData]);

  const hasPrev = prevData && prevData.length > 0;
  const hasCustomCosts = (customCostsTotal || 0) > 0;

  // Build platform list for sidebar
  const adPlatforms = useMemo(() => {
    if (!platforms) return [];
    return Object.entries(platforms)
      .filter(([key]) => key !== 'stripe')
      .map(([key, data]) => {
        const spend = data.totalSpend;
        const revenue = data.totalRevenue || 0;
        return {
          key,
          label: PLATFORM_LABELS[key] || key,
          spend,
          revenue,
          profit: revenue - spend,
          roas: spend > 0 ? revenue / spend : 0,
        };
      })
      .filter(p => p.spend > 0)
      .sort((a, b) => b.spend - a.spend);
  }, [platforms]);

  return (
    <div className="bg-bg-surface rounded-xl border border-border-dim p-5">
      {/* Outer flex: left column (KPIs + chart) | right column (platform sidebar, full height) */}
      <div className="flex flex-col md:flex-row">
        {/* Left: KPIs above chart */}
        <div className="flex-1 min-w-0">
          {/* KPI row */}
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

              {/* Revenue */}
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

              {/* Ad Spend */}
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

              {/* Custom Costs — only when > 0 */}
              {hasCustomCosts && (
                <div className="flex items-start gap-2.5">
                  <span className="mt-1.5 w-[14px] h-[14px] rounded-full bg-text-dim/10 shrink-0" />
                  <div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-text-dim">Custom Costs</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[18px] font-semibold tracking-tight leading-none text-text-dim">
                        ${(customCostsTotal || 0).toLocaleString()}
                      </span>
                      {compCustomCostsTotal !== undefined && compCustomCostsTotal > 0 && (
                        <InlineBadge current={customCostsTotal || 0} previous={compCustomCostsTotal} invert />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chart */}
          {isSingleDay || data.length < 2 ? (
            <GhostChart />
          ) : (
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={merged} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dim)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} tickMargin={8} />
                  <YAxis tickFormatter={formatDollar} tick={{ fontSize: 11, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} tickMargin={4} width={48} />
                  <Tooltip content={<CustomTooltip />} />
                  {hasPrev && showProfit && (
                    <Area type="monotone" dataKey="prevProfit" stroke="var(--text-dim)" strokeWidth={1.5} strokeDasharray="4 3" fill="none" dot={false} activeDot={false} />
                  )}
                  {showProfit && (
                    <Area type="monotone" dataKey="profit" stroke="var(--accent)" strokeWidth={2} fill="url(#profitGradient)" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Right: Platform breakdown — full height of component */}
        {adPlatforms.length > 0 && (
          <div className="hidden md:flex flex-col w-[220px] ml-5 pl-5 border-l border-border-dim/50">
            <div className="text-[10px] font-medium uppercase tracking-wider text-text-dim mb-2">Platforms</div>
            <div className="flex flex-col flex-1 justify-center">
              {adPlatforms.map((p, i) => (
                <div key={p.key} className={`py-3 ${i > 0 ? 'border-t border-border-dim/30' : ''}`}>
                  {/* Name + profit */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-medium text-text-heading">{p.label}</span>
                    <span className={`text-[12px] font-semibold ${p.profit >= 0 ? 'text-success' : 'text-error'}`}>
                      {p.profit >= 0 ? '+' : ''}{formatDollarCompact(p.profit)}
                    </span>
                  </div>
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                    <div>
                      <span className="text-text-dim">Spend</span>
                      <div className="text-[11px] text-text-body font-medium">{formatDollarCompact(p.spend)}</div>
                    </div>
                    <div>
                      <span className="text-text-dim">Revenue</span>
                      <div className="text-[11px] text-text-body font-medium">{formatDollarCompact(p.revenue)}</div>
                    </div>
                    {p.roas > 0 && (
                      <div>
                        <span className="text-text-dim">ROAS</span>
                        <div className="text-[11px] text-text-body font-medium">{p.roas.toFixed(1)}x</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
