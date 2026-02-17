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

// Custom source icon definitions (matches custom-sources page)
const CUSTOM_SOURCE_ICONS: Record<string, { bg: string; svg: React.ReactNode }> = {
  reddit: { bg: '#ff4500', svg: <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.11.793-.26.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg> },
  twitter: { bg: '#000', svg: <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
  snapchat: { bg: '#fffc00', svg: <svg width="11" height="11" viewBox="0 0 24 24" fill="#000"><path d="M12.065 2c.882 0 3.617.145 4.898 3.225.45 1.083.334 2.912.24 4.371l-.02.28c-.013.17-.024.33-.033.478.3.16.63.244.967.244.19 0 .395-.03.597-.115a.86.86 0 01.334-.063c.2 0 .463.07.665.245.262.228.33.54.33.73 0 .583-.677.912-1.334 1.14-.107.038-.463.147-.54.176-.37.128-.578.254-.67.463-.05.116-.038.254.032.42.015.025.75 1.386 2.56 1.865a.423.423 0 01.31.393c0 .02-.036.386-.612.762-.717.465-1.77.766-3.13.897a3.8 3.8 0 00-.195.386c-.12.267-.258.572-.667.572h-.013c-.148 0-.41-.043-.772-.107a8.37 8.37 0 00-1.558-.168 4.75 4.75 0 00-.766.06c-.638.11-1.2.558-1.835 1.055-.85.665-1.813 1.418-3.216 1.418-.064 0-.127-.003-.19-.007-.07.004-.15.007-.23.007-1.402 0-2.366-.753-3.216-1.418-.636-.497-1.197-.945-1.835-1.055a4.7 4.7 0 00-.765-.06c-.543 0-1.07.07-1.558.168-.364.064-.625.107-.773.107h-.013c-.408 0-.547-.305-.667-.572a3.53 3.53 0 00-.195-.386C.843 18.7.77 18.66.577 18.587c-.076-.028-.268-.085-.44-.133C.483 18.35 0 18.1 0 17.57a.423.423 0 01.31-.393c1.81-.478 2.545-1.84 2.56-1.866.07-.166.082-.303.032-.42-.092-.208-.3-.334-.67-.462-.077-.03-.433-.138-.54-.177-.273-.093-1.334-.48-1.334-1.14 0-.226.096-.5.33-.73a.91.91 0 01.665-.244.87.87 0 01.334.063c.203.085.407.115.597.115.337 0 .667-.084.966-.244-.01-.147-.02-.308-.032-.478l-.02-.28c-.093-1.46-.21-3.29.24-4.372C4.732 2.145 7.466 2 8.35 2h.086z"/></svg> },
  pinterest: { bg: '#e60023', svg: <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z"/></svg> },
  bing: { bg: '#008373', svg: <svg width="10" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M5.063 0v18.281l6.156 3.563 7.719-4.5V10.5l-7.719 3.375L8.25 12.47V3.375z"/></svg> },
  amazon: { bg: '#ff9900', svg: <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M.045 18.02c.07-.116.196-.128.348-.037 3.708 2.258 7.878 3.41 12.146 3.41 3.005 0 6.258-.66 9.37-1.97.474-.2.86.154.68.6-.185.445-.01.624.373.4C19.7 22.06 16.066 23 12.29 23 8.196 23 4.212 21.64.66 19.175c-.225-.156-.28-.345-.145-.535l.02-.02.51-.6zM23.538 17.77c-.266-.32-1.746-.15-2.413-.076-.2.024-.23-.15-.05-.276 1.18-.828 3.116-.59 3.34-.312.224.28-.06 2.22-1.166 3.15-.17.142-.332.066-.256-.122.25-.62.81-2.044.545-2.364z"/><path d="M14.43 9.133V7.65c0-.225.017-.483-.1-.675-.1-.158-.3-.258-.497-.258-.7 0-.83.542-.83 1.067v3.35c0 .567-.003 1.133.33 1.6.22.308.56.5.93.5.414 0 .803-.2 1-.55.245-.434.2-.95.2-1.434v-1.117zm2.45 4.475c-.158.142-.39.15-.567.058-.8-.667-1.045-1.625-1.045-1.625-.988 1-1.69 1.3-2.97 1.3-1.516 0-2.693-.934-2.693-2.8 0-1.46.79-2.45 1.916-2.934.975-.425 2.338-.5 3.38-.617v-.233c0-.425.033-.925-.217-1.292-.217-.325-.633-.458-1-.458-.68 0-1.284.35-1.434.908-.108.333-.15.383-.467.392l-1.684-.183c-.216-.05-.458-.225-.396-.558C10.12 3.4 12.18 2.75 14.04 2.75c.95 0 2.188.253 2.938.975.95.883.858 2.067.858 3.35v3.033c0 .913.38 1.313.737 1.808.124.175.152.388-.007.52-.4.334-1.113.955-1.505 1.303l-.08-.13z"/></svg> },
  apple: { bg: '#000', svg: <svg width="10" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg> },
  taboola: { bg: '#003c7f', svg: <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="12" r="10"/></svg> },
  outbrain: { bg: '#f36', svg: <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="12" r="10"/></svg> },
  programmatic: { bg: '#6366f1', svg: <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/></svg> },
  email: { bg: '#059669', svg: <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M2 6l10 7 10-7v12H2z"/><path d="M22 6H2l10 7z"/></svg> },
  affiliate: { bg: '#8b5cf6', svg: <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M17 7a5 5 0 00-10 0c0 2.76 5 10 5 10s5-7.24 5-10zm-5 2a2 2 0 110-4 2 2 0 010 4z"/></svg> },
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
  platformLabels?: Record<string, string>;
  platformIcons?: Record<string, string>;
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

export default function ProfitTrend({ data, prevData, isSingleDay, summary, compSummary, customCostsTotal, compCustomCostsTotal, platforms, platformLabels = {}, platformIcons = {} }: ProfitTrendProps) {
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
          label: platformLabels[key] || PLATFORM_LABELS[key] || key,
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
                    <span className={`text-[22px] font-bold tracking-tight leading-none ${(summary.totalProfit - (customCostsTotal || 0)) >= 0 ? 'text-success' : 'text-error'}`}>
                      {(summary.totalProfit - (customCostsTotal || 0)) >= 0 ? '+' : ''}{fmtCur(summary.totalProfit - (customCostsTotal || 0))}
                    </span>
                    {compSummary && <InlineBadge current={summary.totalProfit - (customCostsTotal || 0)} previous={compSummary.totalProfit - (compCustomCostsTotal || 0)} />}
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
                const customIcon = platformIcons[p.key] ? CUSTOM_SOURCE_ICONS[platformIcons[p.key]] : null;

                return (
                  <div key={p.key} className="rounded-lg bg-bg-elevated/50 px-3 py-2.5">
                    {/* Logo + Name + Profit */}
                    <div className="flex items-center gap-2 mb-2">
                      {LogoComponent ? <LogoComponent /> : customIcon ? (
                        <div className="w-5 h-5 rounded-[5px] flex items-center justify-center flex-shrink-0" style={{ background: customIcon.bg }}>{customIcon.svg}</div>
                      ) : p.key.startsWith('custom_') ? (
                        <div className="w-5 h-5 rounded-[5px] flex items-center justify-center flex-shrink-0 bg-accent/20 text-accent text-[10px] font-bold">{p.label[0]?.toUpperCase()}</div>
                      ) : null}
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
