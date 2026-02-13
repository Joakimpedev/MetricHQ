'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { ComparisonBadge } from '../../../components/KPICard';
import CampaignTable from '../../../components/CampaignTable';
import CountryBreakdown from '../../../components/CountryBreakdown';
import DateRangeSelector, { type DateRange } from '../../../components/DateRangeSelector';
import MarketingAttribution from '../../../components/MarketingAttribution';
import { useSubscription } from '../../../components/SubscriptionProvider';
import OnboardingWizard from '../../../components/OnboardingWizard';

const ProfitTrend = dynamic(() => import('../../../components/ProfitTrend'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface Summary {
  totalSpend: number;
  totalRevenue: number;
  totalProfit: number;
  cpa: number;
  totalPurchases: number;
}

interface Campaign {
  campaignId?: string;
  campaignName?: string;
  spend: number;
  impressions: number;
  clicks: number;
  revenue?: number;
  purchases?: number;
  profit?: number;
  attributed?: boolean;
}

interface Platform {
  totalSpend: number;
  totalRevenue?: number;
  campaigns: Campaign[];
  gated?: boolean;
}

interface Country {
  code: string;
  name: string;
  spend: number;
  revenue: number;
  profit: number;
  roas: number;
  purchases: number;
}

interface TimeSeriesPoint {
  date: string;
  spend: number;
  revenue: number;
  profit: number;
  purchases: number;
}

interface MetricsData {
  summary: Summary;
  platforms: Record<string, Platform>;
  countries: Country[];
  timeSeries: TimeSeriesPoint[];
  comparison?: { summary: Summary; timeSeries: TimeSeriesPoint[] } | Summary;
  unattributedRevenue?: number;
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayRange(): DateRange {
  const today = fmtDate(new Date());
  return { startDate: today, endDate: today };
}

function last7DaysRange(): DateRange {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 6);
  return { startDate: fmtDate(start), endDate: fmtDate(today) };
}

/** Calculate comparison period: same length, immediately preceding */
function getComparisonRange(range: DateRange): { compareStartDate: string; compareEndDate: string } {
  const start = new Date(range.startDate + 'T00:00:00');
  const end = new Date(range.endDate + 'T00:00:00');
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const compEnd = new Date(start);
  compEnd.setDate(compEnd.getDate() - 1);
  const compStart = new Date(compEnd);
  compStart.setDate(compStart.getDate() - days + 1);
  return { compareStartDate: fmtDate(compStart), compareEndDate: fmtDate(compEnd) };
}

function getRangeDays(range: DateRange): number {
  const start = new Date(range.startDate + 'T00:00:00');
  const end = new Date(range.endDate + 'T00:00:00');
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

function formatCompareLabel(range: DateRange): string {
  const comp = getComparisonRange(range);
  const s = new Date(comp.compareStartDate + 'T00:00:00');
  const e = new Date(comp.compareEndDate + 'T00:00:00');
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (comp.compareStartDate === comp.compareEndDate) return fmt(s);
  return `${fmt(s)} – ${fmt(e)}`;
}

function generateDemoData(dateRange: DateRange): MetricsData {
  const start = new Date(dateRange.startDate + 'T00:00:00');
  const end = new Date(dateRange.endDate + 'T00:00:00');
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

  const timeSeries: TimeSeriesPoint[] = [];
  let totalSpend = 0, totalRevenue = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const spend = 120 + Math.round(Math.random() * 80);
    const revenue = 180 + Math.round(Math.random() * 150);
    totalSpend += spend;
    totalRevenue += revenue;
    timeSeries.push({
      date: fmtDate(d),
      spend,
      revenue,
      profit: revenue - spend,
      purchases: 3 + Math.floor(Math.random() * 8),
    });
  }

  const totalPurchases = timeSeries.reduce((s, p) => s + p.purchases, 0);

  return {
    summary: {
      totalSpend,
      totalRevenue,
      totalProfit: totalRevenue - totalSpend,
      cpa: totalPurchases > 0 ? Math.round(totalSpend / totalPurchases * 100) / 100 : 0,
      totalPurchases,
    },
    comparison: {
      summary: {
        totalSpend: Math.round(totalSpend * 0.85),
        totalRevenue: Math.round(totalRevenue * 0.72),
        totalProfit: Math.round(totalRevenue * 0.72 - totalSpend * 0.85),
        cpa: 28.5,
        totalPurchases: Math.round(totalPurchases * 0.8),
      },
      timeSeries: timeSeries.map((p, i) => {
        const seed = i * 7 + 3;
        const spendJitter = 0.7 + ((seed * 13 + 7) % 30) / 100;
        const revJitter = 0.55 + ((seed * 17 + 11) % 35) / 100;
        const prevSpend = Math.round(p.spend * spendJitter);
        const prevRevenue = Math.round(p.revenue * revJitter);
        return {
          ...p,
          spend: prevSpend,
          revenue: prevRevenue,
          profit: prevRevenue - prevSpend,
          purchases: Math.max(1, Math.round(p.purchases * (0.6 + ((seed * 11) % 40) / 100))),
        };
      }),
    },
    countries: [
      { code: 'US', name: 'United States', spend: Math.round(totalSpend * 0.45), revenue: Math.round(totalRevenue * 0.5), profit: Math.round(totalRevenue * 0.5 - totalSpend * 0.45), roas: 2.1, purchases: Math.round(totalPurchases * 0.4) },
      { code: 'GB', name: 'United Kingdom', spend: Math.round(totalSpend * 0.18), revenue: Math.round(totalRevenue * 0.2), profit: Math.round(totalRevenue * 0.2 - totalSpend * 0.18), roas: 1.8, purchases: Math.round(totalPurchases * 0.2) },
      { code: 'DE', name: 'Germany', spend: Math.round(totalSpend * 0.12), revenue: Math.round(totalRevenue * 0.12), profit: Math.round(totalRevenue * 0.12 - totalSpend * 0.12), roas: 1.5, purchases: Math.round(totalPurchases * 0.15) },
      { code: 'NO', name: 'Norway', spend: Math.round(totalSpend * 0.08), revenue: Math.round(totalRevenue * 0.1), profit: Math.round(totalRevenue * 0.1 - totalSpend * 0.08), roas: 2.4, purchases: Math.round(totalPurchases * 0.1) },
      { code: 'CA', name: 'Canada', spend: Math.round(totalSpend * 0.1), revenue: Math.round(totalRevenue * 0.05), profit: Math.round(totalRevenue * 0.05 - totalSpend * 0.1), roas: 0.8, purchases: Math.round(totalPurchases * 0.08) },
      { code: 'AU', name: 'Australia', spend: Math.round(totalSpend * 0.07), revenue: Math.round(totalRevenue * 0.03), profit: Math.round(totalRevenue * 0.03 - totalSpend * 0.07), roas: 0.6, purchases: Math.round(totalPurchases * 0.07) },
    ],
    platforms: {
      google_ads: {
        totalSpend: Math.round(totalSpend * 0.5),
        totalRevenue: Math.round(totalRevenue * 0.35),
        campaigns: [
          { campaignId: 'Brand Search US', spend: Math.round(totalSpend * 0.2), impressions: 14200, clicks: 890, revenue: Math.round(totalRevenue * 0.35), purchases: Math.round(totalPurchases * 0.3), profit: Math.round(totalRevenue * 0.35) - Math.round(totalSpend * 0.2), attributed: true },
          { campaignId: 'Competitor Keywords', spend: Math.round(totalSpend * 0.15), impressions: 8400, clicks: 320, revenue: 0, purchases: 0, profit: -Math.round(totalSpend * 0.15), attributed: false },
          { campaignId: 'Display Retargeting', spend: Math.round(totalSpend * 0.15), impressions: 42000, clicks: 580, revenue: 0, purchases: 0, profit: -Math.round(totalSpend * 0.15), attributed: false },
        ],
      },
      meta: {
        totalSpend: Math.round(totalSpend * 0.3),
        totalRevenue: Math.round(totalRevenue * 0.35),
        campaigns: [
          { campaignName: 'Lookalike - US SaaS Founders', spend: Math.round(totalSpend * 0.18), impressions: 22000, clicks: 440, revenue: Math.round(totalRevenue * 0.2), purchases: Math.round(totalPurchases * 0.2), profit: Math.round(totalRevenue * 0.2) - Math.round(totalSpend * 0.18), attributed: true },
          { campaignName: 'Retargeting - Site Visitors', spend: Math.round(totalSpend * 0.12), impressions: 9500, clicks: 380, revenue: Math.round(totalRevenue * 0.15), purchases: Math.round(totalPurchases * 0.15), profit: Math.round(totalRevenue * 0.15) - Math.round(totalSpend * 0.12), attributed: true },
        ],
      },
      linkedin: {
        totalSpend: Math.round(totalSpend * 0.2),
        totalRevenue: Math.round(totalRevenue * 0.15),
        campaigns: [
          { campaignId: 'B2B Decision Makers', spend: Math.round(totalSpend * 0.12), impressions: 6200, clicks: 95, revenue: Math.round(totalRevenue * 0.1), purchases: Math.round(totalPurchases * 0.08), profit: Math.round(totalRevenue * 0.1) - Math.round(totalSpend * 0.12), attributed: true },
          { campaignId: 'SaaS Founders - EU', spend: Math.round(totalSpend * 0.08), impressions: 3800, clicks: 62, revenue: Math.round(totalRevenue * 0.05), purchases: Math.round(totalPurchases * 0.04), profit: Math.round(totalRevenue * 0.05) - Math.round(totalSpend * 0.08), attributed: true },
        ],
      },
    },
    unattributedRevenue: Math.round(totalRevenue * 0.15),
    timeSeries,
  };
}

export default function DashboardPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const { subscription } = useSubscription();
  const isDemo = searchParams.get('demo') === 'true';
  const isEmbed = searchParams.get('embed') === 'true';
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(isEmbed ? last7DaysRange : todayRange);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  const rangeDays = useMemo(() => getRangeDays(dateRange), [dateRange]);
  const isSingleDay = rangeDays <= 1;
  const compareLabel = useMemo(() => formatCompareLabel(dateRange), [dateRange]);

  const fetchMetrics = useCallback(async () => {
    if (isDemo) {
      setData(generateDemoData(dateRange));
      setLoading(false);
      return;
    }
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const comp = getComparisonRange(dateRange);
      const params = new URLSearchParams({
        userId: user.id,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        compareStartDate: comp.compareStartDate,
        compareEndDate: comp.compareEndDate,
      });
      const response = await fetch(`${API_URL}/api/metrics?${params}`);
      const json = await response.json();
      if (!response.ok) {
        setError(json.error || 'Failed to load metrics');
        return;
      }
      setData(json);
    } catch {
      setError('Network error loading metrics.');
    } finally {
      setLoading(false);
    }
  }, [user?.id, dateRange, isDemo]);

  // Check if user has any connections — if not, show onboarding
  useEffect(() => {
    if (isDemo || !user?.id) {
      setShowOnboarding(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/connections?userId=${encodeURIComponent(user.id)}`);
        const json = await res.json();
        if (!res.ok) { setShowOnboarding(false); return; }
        const hasConnections = Object.values(json.connections || {}).some((c: unknown) => (c as { connected?: boolean }).connected);
        setShowOnboarding(!hasConnections);
      } catch {
        setShowOnboarding(false);
      }
    })();
  }, [user?.id, isDemo]);

  useEffect(() => {
    if (showOnboarding === null || showOnboarding) return;
    if (isDemo) {
      fetchMetrics();
      return;
    }
    if (!user?.id) return;
    fetchMetrics();
  }, [user?.id, fetchMetrics, isDemo, showOnboarding]);

  // Show onboarding wizard if user has zero connections
  if (showOnboarding && !isDemo) {
    return (
      <div className="max-w-[1400px] mx-auto">
        <OnboardingWizard userId={user!.id} onComplete={() => { setShowOnboarding(false); fetchMetrics(); }} />
      </div>
    );
  }

  if (loading || showOnboarding === null) {
    return (
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Date selector skeleton */}
        <div className="flex justify-end">
          <div className="w-40 h-8 bg-bg-elevated animate-pulse rounded-lg" />
        </div>
        {/* KPI bar skeleton */}
        <div className="bg-bg-surface rounded-xl border border-border-dim flex flex-col md:flex-row md:divide-x divide-border-dim">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex-1 px-5 py-4 border-t md:border-t-0 border-border-dim first:border-t-0">
              <div className="w-16 h-3 bg-bg-elevated animate-pulse rounded-lg mb-3" />
              <div className="w-28 h-7 bg-bg-elevated animate-pulse rounded-lg" />
            </div>
          ))}
        </div>
        {/* Chart skeleton */}
        <div className="bg-bg-surface rounded-xl border border-border-dim p-5">
          <div className="h-[240px] bg-bg-elevated animate-pulse rounded-lg" />
        </div>
        {/* Attribution cards skeleton */}
        <div className="flex flex-wrap gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-[220px] bg-bg-surface rounded-xl border border-border-dim p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 bg-bg-elevated animate-pulse rounded-lg" />
                <div className="w-20 h-3 bg-bg-elevated animate-pulse rounded-lg" />
              </div>
              <div className="w-16 h-3 bg-bg-elevated animate-pulse rounded-lg mb-1.5" />
              <div className="w-16 h-3 bg-bg-elevated animate-pulse rounded-lg mb-3" />
              <div className="w-24 h-6 bg-bg-elevated animate-pulse rounded-lg" />
            </div>
          ))}
        </div>
        {/* Tables skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-bg-surface rounded-xl border border-border-dim overflow-hidden">
              <div className="px-5 py-4 border-b border-border-dim">
                <div className="w-24 h-4 bg-bg-elevated animate-pulse rounded-lg" />
              </div>
              {[...Array(4)].map((_, j) => (
                <div key={j} className="px-5 py-3 border-b border-border-dim/40 last:border-0">
                  <div className="w-full h-3 bg-bg-elevated animate-pulse rounded-lg" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-error text-[13px]">{error}</p>
      </div>
    );
  }

  const summary = data?.summary || { totalSpend: 0, totalRevenue: 0, totalProfit: 0, cpa: 0, totalPurchases: 0 };
  // Handle both new format { summary, timeSeries } and old flat Summary format
  const rawComp = data?.comparison;
  const compSummary = rawComp && 'summary' in rawComp ? rawComp.summary : (rawComp as Summary | undefined);
  const compTimeSeries = rawComp && 'timeSeries' in rawComp ? rawComp.timeSeries : [];
  const platforms = data?.platforms || {};
  const countries = data?.countries || [];
  const timeSeries = data?.timeSeries || [];
  const unattributedRevenue = data?.unattributedRevenue || 0;

  const adPlatforms = Object.entries(platforms).filter(([key]) => key !== 'stripe');

  const hasAnyData = summary.totalSpend > 0 || summary.totalRevenue > 0 || countries.length > 0 || timeSeries.length > 0;

  // Fallback: if data loaded but everything is empty, show wizard as a second chance
  if (!hasAnyData && !isDemo && user?.id) {
    return (
      <div className="max-w-[1400px] mx-auto">
        <OnboardingWizard userId={user.id} onComplete={() => { setShowOnboarding(false); fetchMetrics(); }} />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Top bar: date range */}
      <div className="flex justify-end">
        <DateRangeSelector value={dateRange} onChange={setDateRange} compareLabel={compareLabel} dataRetentionDays={isDemo ? undefined : subscription?.limits?.dataRetentionDays} />
      </div>

      {/* KPI bar */}
      <div className="bg-bg-surface rounded-xl border border-border-dim flex flex-col md:flex-row md:divide-x divide-border-dim">
        <div className="flex-1 px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-text-dim">Profit</span>
            {compSummary?.totalProfit !== undefined && (
              <ComparisonBadge current={summary.totalProfit} previous={compSummary.totalProfit} />
            )}
          </div>
          <p className={`text-[28px] font-bold tracking-tight mt-1.5 leading-none ${summary.totalProfit >= 0 ? 'text-success' : 'text-error'}`}>
            {summary.totalProfit >= 0 ? '+' : ''}${summary.totalProfit.toLocaleString()}
          </p>
        </div>
        <div className="flex-1 px-5 py-4 border-t md:border-t-0 border-border-dim">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-text-dim">Revenue</span>
            {compSummary?.totalRevenue !== undefined && (
              <ComparisonBadge current={summary.totalRevenue} previous={compSummary.totalRevenue} />
            )}
          </div>
          <p className="text-[28px] font-bold tracking-tight mt-1.5 leading-none text-text-heading">
            ${summary.totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="flex-1 px-5 py-4 border-t md:border-t-0 border-border-dim">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-text-dim">Ad Spend</span>
            {compSummary?.totalSpend !== undefined && (
              <ComparisonBadge current={summary.totalSpend} previous={compSummary.totalSpend} invert />
            )}
          </div>
          <p className="text-[28px] font-bold tracking-tight mt-1.5 leading-none text-text-heading">
            ${summary.totalSpend.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Profit trend chart — linked to main date range */}
      <ProfitTrend data={timeSeries} prevData={compTimeSeries} isSingleDay={isSingleDay} />

      {/* Marketing Attribution */}
      {(adPlatforms.length > 0 || unattributedRevenue > 0) && (
        <MarketingAttribution platforms={platforms} unattributedRevenue={unattributedRevenue} />
      )}

      {/* Countries + Campaigns side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        <CountryBreakdown countries={countries} />

        {adPlatforms.length > 0 ? (
          <div className="space-y-4">
            {adPlatforms.map(([platform, pData]) => (
              <CampaignTable
                key={platform}
                platform={platform}
                totalSpend={pData.totalSpend}
                campaigns={pData.campaigns}
                gated={pData.gated}
              />
            ))}
          </div>
        ) : (
          <div className="bg-bg-surface rounded-xl border border-border-dim p-5 flex items-center justify-center">
            <p className="text-text-dim text-[12px]">No campaign data yet. Connect your ad accounts.</p>
          </div>
        )}
      </div>
    </div>
  );
}
