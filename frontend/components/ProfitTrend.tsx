'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { useCurrency } from '../lib/currency';

/* ── Small platform logos for sidebar (20×20) ── */

function MiniGoogleAdsLogo() {
  return (
    <div className="w-5 h-5 rounded-[5px] flex items-center justify-center flex-shrink-0" style={{ background: '#4285f4' }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
        <path d="M3.272 20.1l4.29-16.2c.36-1.36 1.78-2.18 3.14-1.82l1.36.36c1.36.36 2.18 1.78 1.82 3.14l-4.29 16.2c-.36 1.36-1.78 2.18-3.14 1.82l-1.36-.36c-1.36-.36-2.18-1.78-1.82-3.14z" fill="#fff" opacity="0.7"/>
        <path d="M10.272 20.1l4.29-16.2c.36-1.36 1.78-2.18 3.14-1.82l1.36.36c1.36.36 2.18 1.78 1.82 3.14l-4.29 16.2c-.36 1.36-1.78 2.18-3.14 1.82l-1.36-.36c-1.36-.36-2.18-1.78-1.82-3.14z" fill="#fff"/>
        <circle cx="6" cy="20" r="2.5" fill="#fff"/>
      </svg>
    </div>
  );
}

function MiniMetaLogo() {
  return (
    <div className="w-5 h-5 rounded-[5px] flex items-center justify-center flex-shrink-0" style={{ background: '#1877f2' }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#fff"/>
      </svg>
    </div>
  );
}

function MiniTikTokLogo() {
  return (
    <div className="w-5 h-5 rounded-[5px] flex items-center justify-center flex-shrink-0 border border-border-dim/50" style={{ background: '#111' }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.08a8.27 8.27 0 004.76 1.5V7.13a4.83 4.83 0 01-1-.44z" fill="#fff"/>
      </svg>
    </div>
  );
}

function MiniLinkedInLogo() {
  return (
    <div className="w-5 h-5 rounded-[5px] flex items-center justify-center flex-shrink-0" style={{ background: '#0a66c2' }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#fff"/>
      </svg>
    </div>
  );
}

const MINI_LOGOS: Record<string, () => React.ReactNode> = {
  google_ads: MiniGoogleAdsLogo,
  meta: MiniMetaLogo,
  tiktok: MiniTikTokLogo,
  linkedin: MiniLinkedInLogo,
};

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
  revenue: number;
  spend: number;
  customCosts: number;
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

const ALL_AD_PLATFORMS = ['google_ads', 'meta', 'tiktok', 'linkedin'];

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
function makeCustomTooltip(fmt: (n: number) => string) {
  return function CustomTooltip(props: any) {
    const { active, payload, label } = props || {};
    if (!active || !payload?.length) return null;

    const point = payload[0]?.payload as MergedPoint | undefined;
    if (!point) return null;

    const dateLabel = typeof label === 'string' ? label : '';

    return (
      <div className="bg-bg-elevated border border-border-dim rounded-lg px-3 py-2 shadow-lg min-w-[140px]">
        <p className="text-[11px] text-text-dim mb-1.5">{dateLabel ? formatDate(dateLabel) : ''}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-[11px] text-text-dim">Revenue</span>
            <span className="text-[12px] font-medium text-text-body tabular-nums">{fmt(point.revenue)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[11px] text-text-dim">Ad Spend</span>
            <span className="text-[12px] font-medium text-text-body tabular-nums">-{fmt(point.spend)}</span>
          </div>
          {point.customCosts > 0 && (
            <div className="flex justify-between gap-4">
              <span className="text-[11px] text-text-dim">Custom Costs</span>
              <span className="text-[12px] font-medium text-text-body tabular-nums">-{fmt(Math.round(point.customCosts))}</span>
            </div>
          )}
          <div className="flex justify-between gap-4 pt-1 border-t border-border-dim/50">
            <span className="text-[11px] font-medium text-text-dim">Profit</span>
            <span className={`text-[13px] font-semibold tabular-nums ${point.profit >= 0 ? 'text-success' : 'text-error'}`}>
              {point.profit >= 0 ? '+' : ''}{fmt(Math.round(point.profit))}
            </span>
          </div>
        </div>
      </div>
    );
  };
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
  const { formatCurrency: fmtCur, formatCurrencyCompact: fmtCompact } = useCurrency();
  const [showProfit, setShowProfit] = useState(true);

  const dailyCustomCosts = data.length > 0 ? (customCostsTotal || 0) / data.length : 0;

  const merged = useMemo<MergedPoint[]>(() => {
    return data.map((point) => ({
      date: point.date,
      profit: point.profit - dailyCustomCosts,
      revenue: point.revenue,
      spend: point.spend,
      customCosts: dailyCustomCosts,
    }));
  }, [data, dailyCustomCosts]);

  const hasCustomCosts = (customCostsTotal || 0) > 0;

  const TooltipComponent = useMemo(() => makeCustomTooltip(fmtCur), [fmtCur]);
  const yAxisFormatter = useMemo(() => (value: number) => fmtCompact(value), [fmtCompact]);

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
                      {summary.totalProfit >= 0 ? '+' : ''}{fmtCur(summary.totalProfit)}
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
                      {fmtCur(summary.totalRevenue)}
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
                      {fmtCur(summary.totalSpend)}
                    </span>
                    {compSummary && <InlineBadge current={summary.totalSpend} previous={compSummary.totalSpend} invert />}
                  </div>
                </div>
              </div>

              {/* Custom Costs — only when > 0 */}
              {hasCustomCosts && (
                <div className="flex items-start gap-2.5">
                  <span className="mt-1.5 w-[14px] h-[14px] rounded-full bg-text-dim/20 shrink-0" />
                  <div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-text-dim">Custom Costs</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[22px] font-bold tracking-tight leading-none text-text-heading">
                        {fmtCur(customCostsTotal || 0)}
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
                  <YAxis tickFormatter={yAxisFormatter} tick={{ fontSize: 11, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} tickMargin={4} width={48} />
                  <Tooltip content={<TooltipComponent />} />
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
            <div className="text-[10px] font-medium uppercase tracking-wider text-text-dim mb-3">Platforms</div>
            <div className="flex flex-col flex-1 justify-start gap-1">
              {adPlatforms.map((p) => {
                const LogoComponent = MINI_LOGOS[p.key];

                return (
                  <div key={p.key} className="rounded-lg bg-bg-elevated/50 px-3 py-2.5">
                    {/* Logo + Name + Profit */}
                    <div className="flex items-center gap-2 mb-2">
                      {LogoComponent && <LogoComponent />}
                      <span className="text-[12px] font-medium text-text-heading flex-1 truncate">{p.label}</span>
                      <span className={`text-[12px] font-semibold tabular-nums ${p.profit >= 0 ? 'text-success' : 'text-error'}`}>
                        {p.profit >= 0 ? '+' : ''}{fmtCompact(p.profit)}
                      </span>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 text-[10px]">
                      <div className="flex-1">
                        <span className="text-text-dim">Spend</span>
                        <div className="text-[11px] text-text-body font-medium tabular-nums">{fmtCompact(p.spend)}</div>
                      </div>
                      <div className="flex-1">
                        <span className="text-text-dim">Rev</span>
                        <div className="text-[11px] text-text-body font-medium tabular-nums">{fmtCompact(p.revenue)}</div>
                      </div>
                      {p.roas > 0 && (
                        <div>
                          <span className="text-text-dim">ROAS</span>
                          <div className="text-[11px] text-text-body font-medium tabular-nums">{p.roas.toFixed(1)}x</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {!ALL_AD_PLATFORMS.every(p => adPlatforms.some(ap => ap.key === p)) && (
                <Link
                  href="/integrations"
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-dim/60 px-3 py-2.5 text-[11px] font-medium text-text-dim hover:border-accent/50 hover:text-accent transition-colors"
                >
                  <Plus size={12} />
                  Add platform
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
