'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import CampaignTable from '../../../components/CampaignTable';
import CountryBreakdown from '../../../components/CountryBreakdown';
import DateRangeSelector, { type DateRange } from '../../../components/DateRangeSelector';
import { useSubscription } from '../../../components/SubscriptionProvider';
import OnboardingWizard from '../../../components/OnboardingWizard';
import CostBreakdownChart from '../../../components/CostBreakdownChart';
import { useCurrency } from '../../../lib/currency';

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

interface CountryCampaign {
  platform: string;
  campaign: string;
  spend: number;
  revenue: number;
  impressions: number;
  clicks: number;
  purchases: number;
}

interface MetricsData {
  summary: Summary;
  platforms: Record<string, Platform>;
  countries: Country[];
  countryCampaigns?: Record<string, CountryCampaign[]>;
  timeSeries: TimeSeriesPoint[];
  comparison?: { summary: Summary; timeSeries: TimeSeriesPoint[] } | Summary;
  unattributedRevenue?: number;
  unattributedSpend?: number;
  customCostsTotal?: number;
  customCostsBreakdown?: { name: string; category: string | null; amount: number; currency: string; frequency?: string; configuredAmount?: number; configuredCurrency?: string }[];
  dataRetentionLimit?: { days: number; earliestDate: string } | null;
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

function last30DaysRange(): DateRange {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 29);
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

const PLATFORM_LABELS: Record<string, string> = { google_ads: 'Google Ads', meta: 'Meta', tiktok: 'TikTok', linkedin: 'LinkedIn' };

/** Prorate a monthly amount across a date range using actual days per month (matches backend) */
function prorateMonthly(monthlyAmount: number, rangeStart: Date, rangeEnd: Date): number {
  let total = 0;
  const cursor = new Date(rangeStart);
  while (cursor <= rangeEnd) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthLast = new Date(year, month + 1, 0);
    monthLast.setHours(0, 0, 0, 0);
    const segEnd = monthLast < rangeEnd ? monthLast : rangeEnd;
    const segDays = Math.round((segEnd.getTime() - cursor.getTime()) / 86400000) + 1;
    total += (monthlyAmount / daysInMonth) * segDays;
    cursor.setFullYear(year, month + 1, 1);
    cursor.setHours(0, 0, 0, 0);
  }
  return Math.round(total * 100) / 100;
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

  // ── Single source of truth: atomic country+campaign rows ──
  // All other structures (countries, platforms, countryCampaigns) are derived from this.
  // spend/revenue/purchases use fractions of totals; impressions/clicks are absolute.
  const COUNTRY_NAMES: Record<string, string> = { US: 'United States', GB: 'United Kingdom', DE: 'Germany', NO: 'Norway', CA: 'Canada', AU: 'Australia' };
  const atoms = [
    // google_ads — Brand Search US (attributed)
    { country: 'US', platform: 'google_ads', campaign: 'Brand Search US', attributed: true,  sf: 0.12, rf: 0.14, pf: 0.10, imp: 9800,  clk: 620 },
    { country: 'GB', platform: 'google_ads', campaign: 'Brand Search US', attributed: true,  sf: 0.04, rf: 0.05, pf: 0.05, imp: 3200,  clk: 180 },
    { country: 'DE', platform: 'google_ads', campaign: 'Brand Search US', attributed: true,  sf: 0.03, rf: 0.04, pf: 0.04, imp: 2100,  clk: 120 },
    { country: 'NO', platform: 'google_ads', campaign: 'Brand Search US', attributed: true,  sf: 0.02, rf: 0.03, pf: 0.03, imp: 1400,  clk: 85  },
    // google_ads — Competitor Keywords (unattributed)
    { country: 'US', platform: 'google_ads', campaign: 'Competitor Keywords', attributed: false, sf: 0.06, rf: 0, pf: 0, imp: 5200,  clk: 195 },
    { country: 'CA', platform: 'google_ads', campaign: 'Competitor Keywords', attributed: false, sf: 0.04, rf: 0, pf: 0, imp: 2800,  clk: 95  },
    // google_ads — Display Retargeting (unattributed)
    { country: 'US', platform: 'google_ads', campaign: 'Display Retargeting', attributed: false, sf: 0.04, rf: 0, pf: 0, imp: 28000, clk: 380 },
    { country: 'AU', platform: 'google_ads', campaign: 'Display Retargeting', attributed: false, sf: 0.03, rf: 0, pf: 0, imp: 8500,  clk: 120 },
    // meta — Lookalike
    { country: 'US', platform: 'meta', campaign: 'Lookalike - US SaaS Founders', attributed: true, sf: 0.06, rf: 0.08, pf: 0.07, imp: 15400, clk: 310 },
    { country: 'GB', platform: 'meta', campaign: 'Lookalike - US SaaS Founders', attributed: true, sf: 0.04, rf: 0.04, pf: 0.04, imp: 4800,  clk: 95  },
    { country: 'DE', platform: 'meta', campaign: 'Lookalike - US SaaS Founders', attributed: true, sf: 0.03, rf: 0.03, pf: 0.03, imp: 3500,  clk: 72  },
    { country: 'CA', platform: 'meta', campaign: 'Lookalike - US SaaS Founders', attributed: true, sf: 0.02, rf: 0.01, pf: 0.01, imp: 2200,  clk: 48  },
    // meta — Retargeting
    { country: 'US', platform: 'meta', campaign: 'Retargeting - Site Visitors', attributed: true, sf: 0.04, rf: 0.05, pf: 0.04, imp: 6200,  clk: 250 },
    { country: 'NO', platform: 'meta', campaign: 'Retargeting - Site Visitors', attributed: true, sf: 0.03, rf: 0.03, pf: 0.03, imp: 2800,  clk: 68  },
    { country: 'AU', platform: 'meta', campaign: 'Retargeting - Site Visitors', attributed: true, sf: 0.02, rf: 0.02, pf: 0.02, imp: 1800,  clk: 42  },
    // tiktok — SaaS Demo Signups
    { country: 'US', platform: 'tiktok', campaign: 'SaaS Demo Signups', attributed: true, sf: 0.05, rf: 0.03, pf: 0.03, imp: 38000, clk: 680 },
    { country: 'DE', platform: 'tiktok', campaign: 'SaaS Demo Signups', attributed: true, sf: 0.02, rf: 0.01, pf: 0.01, imp: 18000, clk: 340 },
    { country: 'CA', platform: 'tiktok', campaign: 'SaaS Demo Signups', attributed: true, sf: 0.02, rf: 0.01, pf: 0.01, imp: 12000, clk: 220 },
    // tiktok — Founder Testimonials
    { country: 'GB', platform: 'tiktok', campaign: 'Founder Testimonials', attributed: true, sf: 0.04, rf: 0.02, pf: 0.02, imp: 22000, clk: 410 },
    { country: 'US', platform: 'tiktok', campaign: 'Founder Testimonials', attributed: true, sf: 0.03, rf: 0.01, pf: 0.01, imp: 18000, clk: 320 },
    // linkedin — no country breakdown (unattributed to country)
    // LinkedIn doesn't report by country, so these don't appear in countryCampaigns
  ];

  // LinkedIn campaigns — exist in platforms but not in countryCampaigns (matches real behavior)
  const linkedinCampaigns = [
    { campaign: 'B2B Decision Makers', sf: 0.06, rf: 0.07, pf: 0.05, imp: 6200, clk: 95 },
    { campaign: 'SaaS Founders - EU', sf: 0.04, rf: 0.03, pf: 0.03, imp: 3800, clk: 62 },
  ];

  // ── Derive countryCampaigns ──
  const countryCampaigns: Record<string, CountryCampaign[]> = {};
  for (const a of atoms) {
    if (!countryCampaigns[a.country]) countryCampaigns[a.country] = [];
    countryCampaigns[a.country].push({
      platform: a.platform,
      campaign: a.campaign,
      spend: Math.round(totalSpend * a.sf),
      revenue: Math.round(totalRevenue * a.rf),
      impressions: a.imp,
      clicks: a.clk,
      purchases: Math.round(totalPurchases * a.pf),
    });
  }

  // ── Derive countries by aggregating atoms ──
  const countryAgg: Record<string, { spend: number; revenue: number; purchases: number }> = {};
  for (const a of atoms) {
    if (!countryAgg[a.country]) countryAgg[a.country] = { spend: 0, revenue: 0, purchases: 0 };
    countryAgg[a.country].spend += Math.round(totalSpend * a.sf);
    countryAgg[a.country].revenue += Math.round(totalRevenue * a.rf);
    countryAgg[a.country].purchases += Math.round(totalPurchases * a.pf);
  }
  const countries: Country[] = Object.entries(countryAgg)
    .map(([code, d]) => ({
      code,
      name: COUNTRY_NAMES[code] || code,
      spend: d.spend,
      revenue: d.revenue,
      profit: d.revenue - d.spend,
      roas: d.spend > 0 ? Math.round((d.revenue / d.spend) * 10) / 10 : 0,
      purchases: d.purchases,
    }))
    .sort((a, b) => b.spend - a.spend);

  // ── Derive platforms + campaigns by aggregating atoms ──
  type CampAgg = { spend: number; revenue: number; purchases: number; impressions: number; clicks: number; attributed: boolean };
  const campAgg: Record<string, Record<string, CampAgg>> = {};
  for (const a of atoms) {
    if (!campAgg[a.platform]) campAgg[a.platform] = {};
    if (!campAgg[a.platform][a.campaign]) campAgg[a.platform][a.campaign] = { spend: 0, revenue: 0, purchases: 0, impressions: 0, clicks: 0, attributed: a.attributed };
    const c = campAgg[a.platform][a.campaign];
    c.spend += Math.round(totalSpend * a.sf);
    c.revenue += Math.round(totalRevenue * a.rf);
    c.purchases += Math.round(totalPurchases * a.pf);
    c.impressions += a.imp;
    c.clicks += a.clk;
  }
  // Add LinkedIn campaigns to campAgg
  campAgg['linkedin'] = {};
  for (const lc of linkedinCampaigns) {
    campAgg['linkedin'][lc.campaign] = {
      spend: Math.round(totalSpend * lc.sf),
      revenue: Math.round(totalRevenue * lc.rf),
      purchases: Math.round(totalPurchases * lc.pf),
      impressions: lc.imp,
      clicks: lc.clk,
      attributed: true,
    };
  }

  const platforms: Record<string, Platform> = {};
  const usesCampaignName = new Set(['meta', 'tiktok']);
  for (const [plat, camps] of Object.entries(campAgg)) {
    const campaignList: Campaign[] = Object.entries(camps).map(([name, d]) => ({
      ...(usesCampaignName.has(plat) ? { campaignName: name } : { campaignId: name }),
      spend: d.spend,
      impressions: d.impressions,
      clicks: d.clicks,
      revenue: d.attributed ? d.revenue : 0,
      purchases: d.attributed ? d.purchases : 0,
      profit: d.attributed ? d.revenue - d.spend : -d.spend,
      attributed: d.attributed,
    }));
    const platSpend = campaignList.reduce((s, c) => s + c.spend, 0);
    const platRevenue = campaignList.reduce((s, c) => s + (c.revenue || 0), 0);
    platforms[plat] = { totalSpend: platSpend, totalRevenue: platRevenue, campaigns: campaignList };
  }

  // LinkedIn unattributed spend (no country breakdown)
  const linkedinSpend = platforms['linkedin']?.totalSpend || 0;

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
    countries,
    countryCampaigns,
    platforms,
    unattributedRevenue: Math.round(totalRevenue * 0.15),
    unattributedSpend: linkedinSpend,
    customCostsBreakdown: [
      { name: 'Stripe processing fees', category: 'Transaction Fees', amount: Math.round(totalRevenue * 0.029), currency: 'USD', frequency: 'variable' },
      { name: 'Vercel hosting', category: 'SaaS Tools', amount: prorateMonthly(20, start, end), currency: 'USD', frequency: 'monthly', configuredAmount: 20, configuredCurrency: 'USD' },
      { name: 'Railway DB', category: 'SaaS Tools', amount: prorateMonthly(15, start, end), currency: 'USD', frequency: 'monthly', configuredAmount: 15, configuredCurrency: 'USD' },
      { name: 'Figma', category: 'SaaS Tools', amount: prorateMonthly(12, start, end), currency: 'USD', frequency: 'monthly', configuredAmount: 12, configuredCurrency: 'USD' },
      { name: 'Freelance designer', category: 'Team', amount: prorateMonthly(450, start, end), currency: 'EUR', frequency: 'monthly', configuredAmount: 450, configuredCurrency: 'EUR' },
      { name: 'Content writer', category: 'Team', amount: prorateMonthly(200, start, end), currency: 'GBP', frequency: 'monthly', configuredAmount: 200, configuredCurrency: 'GBP' },
    ],
    timeSeries,
  };
}

export default function DashboardPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const { subscription } = useSubscription();
  const { convertFromCurrency } = useCurrency();
  const isDemo = searchParams.get('demo') === 'true';
  const isEmbed = searchParams.get('embed') === 'true';
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(isDemo ? last30DaysRange : (isEmbed ? last7DaysRange : todayRange));
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Demo-only: secret 5-click-in-5s to toggle UTM off per campaign
  const [demoUtmOff, setDemoUtmOff] = useState<Set<string>>(new Set());
  const clickTracker = useRef<Record<string, number[]>>({});

  const handleDemoCampaignClick = useCallback((platform: string, index: number) => {
    if (!isDemo) return;
    const key = `${platform}::${index}`;
    const now = Date.now();
    const clicks = clickTracker.current[key] || [];
    clicks.push(now);
    // Keep only clicks within last 5 seconds
    const recent = clicks.filter(t => now - t < 5000);
    clickTracker.current[key] = recent;
    if (recent.length >= 5) {
      clickTracker.current[key] = [];
      setDemoUtmOff(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
      });
    }
  }, [isDemo]);

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
        if (json.error === 'team_owner_downgraded') {
          setError(json.message || "Your team owner's Pro plan is no longer active. Contact them to restore access.");
        } else {
          setError(json.error || 'Failed to load metrics');
        }
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
        // If user is mid-onboarding (came back from OAuth redirect), keep showing wizard
        const midOnboarding = typeof window !== 'undefined' && sessionStorage.getItem('metrichq-onboarding-step');
        setShowOnboarding(!hasConnections || !!midOnboarding);
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

  // Demo-only: apply UTM-off overrides to platform/campaign data
  const demoPatched = useMemo(() => {
    const raw = data?.platforms || {};
    if (!isDemo || demoUtmOff.size === 0) return raw;
    const patched: Record<string, Platform> = {};
    for (const [plat, pData] of Object.entries(raw)) {
      const campaigns = pData.campaigns.map((c, i) => {
        if (demoUtmOff.has(`${plat}::${i}`)) {
          return { ...c, revenue: 0, purchases: 0, profit: -c.spend, attributed: false };
        }
        return c;
      });
      const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
      patched[plat] = { ...pData, totalRevenue, campaigns };
    }
    return patched;
  }, [isDemo, demoUtmOff, data?.platforms]);

  // Compute customCostsTotal from breakdown items using live exchange rates (matches donut chart)
  const customCostsBreakdown = data?.customCostsBreakdown || [];
  const customCostsTotal = useMemo(() => {
    return customCostsBreakdown.reduce((sum, item) => sum + convertFromCurrency(item.amount, item.currency), 0);
  }, [customCostsBreakdown, convertFromCurrency]);

  // Build combined cost breakdown: ad spend platforms + custom costs
  const combinedBreakdown = useMemo(() => {
    const adSpendItems = Object.entries(demoPatched)
      .filter(([key]) => key !== 'stripe' && (demoPatched[key]?.totalSpend || 0) > 0)
      .map(([key, pData]) => ({
        name: PLATFORM_LABELS[key] || key,
        category: 'Ad Spend' as string | null,
        amount: pData.totalSpend,
        currency: 'USD',
      }));
    return [...adSpendItems, ...customCostsBreakdown];
  }, [demoPatched, customCostsBreakdown]);

  // Show onboarding wizard if user has zero connections
  if (showOnboarding && !isDemo) {
    return (
      <div className="max-w-[1400px] mx-auto">
        <OnboardingWizard userId={user!.id} onComplete={() => {
          setShowOnboarding(false);
          setSyncing(true);
          // Trigger sync in background
          fetch(`${API_URL}/api/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user!.id }),
          }).catch(() => {});
          // Poll for data
          const poll = setInterval(async () => {
            try {
              const res = await fetch(`${API_URL}/api/sync/status?userId=${encodeURIComponent(user!.id)}`);
              const json = await res.json();
              if (json.status === 'idle' || json.status === 'complete') {
                clearInterval(poll);
                setSyncing(false);
                fetchMetrics();
              }
            } catch { /* keep polling */ }
          }, 3000);
          setTimeout(() => { clearInterval(poll); setSyncing(false); fetchMetrics(); }, 60000);
          fetchMetrics();
        }} />
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
        {/* Chart skeleton (KPIs on top, chart + platform sidebar) */}
        <div className="bg-bg-surface rounded-xl border border-border-dim p-5">
          <div className="flex gap-8 mb-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="mt-1.5 w-[14px] h-[14px] bg-bg-elevated animate-pulse rounded" />
                <div>
                  <div className="w-14 h-3 bg-bg-elevated animate-pulse rounded-lg mb-2" />
                  <div className="w-20 h-6 bg-bg-elevated animate-pulse rounded-lg" />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-4">
            <div className="flex-1 h-[360px] bg-bg-elevated animate-pulse rounded-lg" />
            <div className="hidden md:flex flex-col gap-3 w-[220px] pl-5 ml-5 border-l border-border-dim/50 justify-center">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-6 h-6 bg-bg-elevated animate-pulse rounded-md" />
                  <div>
                    <div className="w-14 h-2.5 bg-bg-elevated animate-pulse rounded mb-1.5" />
                    <div className="w-12 h-4 bg-bg-elevated animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
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
  const countries = data?.countries || [];
  const timeSeries = data?.timeSeries || [];
  const unattributedRevenue = data?.unattributedRevenue || 0;
  const unattributedSpend = data?.unattributedSpend || 0;
  const countryCampaigns = data?.countryCampaigns || {};
  const platforms = demoPatched;

  const retentionLimit = data?.dataRetentionLimit;
  // Show retention banner if the selected start date was before the retention limit
  const showRetentionBanner = retentionLimit && dateRange.startDate < retentionLimit.earliestDate;

  const adPlatforms = Object.entries(platforms).filter(([key]) => key !== 'stripe');

  const hasAnyData = summary.totalSpend > 0 || summary.totalRevenue > 0 || countries.length > 0 || timeSeries.length > 0;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Top bar: date range */}
      <div className="flex justify-end">
        <DateRangeSelector value={dateRange} onChange={setDateRange} compareLabel={compareLabel} dataRetentionDays={isDemo ? undefined : subscription?.limits?.dataRetentionDays} />
      </div>

      {/* Data retention banner */}
      {showRetentionBanner && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
          <span className="text-yellow-600 dark:text-yellow-400 text-[12px]">
            Showing data from {new Date(retentionLimit.earliestDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.{' '}
            <a href="/pricing" className="text-accent hover:text-accent-hover font-medium underline underline-offset-2">
              Upgrade
            </a>{' '}
            for longer history.
          </span>
        </div>
      )}

      {/* Profit trend chart with platform sidebar */}
      <ProfitTrend
        data={timeSeries}
        prevData={compTimeSeries}
        isSingleDay={isSingleDay}
        summary={{ totalProfit: summary.totalProfit, totalRevenue: summary.totalRevenue, totalSpend: summary.totalSpend }}
        compSummary={compSummary ? { totalProfit: compSummary.totalProfit, totalRevenue: compSummary.totalRevenue, totalSpend: compSummary.totalSpend } : undefined}
        customCostsTotal={customCostsTotal}
        platforms={platforms}
      />

      {/* Countries + Campaigns side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        <div className="space-y-4">
          <CountryBreakdown countries={countries} unattributedSpend={unattributedSpend} countryCampaigns={countryCampaigns} />
          {combinedBreakdown.length > 0 && (
            <CostBreakdownChart breakdown={combinedBreakdown} />
          )}
        </div>

        {adPlatforms.length > 0 ? (
          <div className="space-y-4">
            {adPlatforms.map(([platform, pData]) => (
              <CampaignTable
                key={platform}
                platform={platform}
                totalSpend={pData.totalSpend}
                campaigns={pData.campaigns}
                gated={pData.gated}
                onCampaignClick={isDemo ? handleDemoCampaignClick : undefined}
                showUtmBanner={summary.totalRevenue > 0 && pData.totalSpend > 0 && !(pData.totalRevenue || 0)}
                countryCampaigns={countryCampaigns}
                countries={countries}
              />
            ))}
          </div>
        ) : (
          <div className="bg-bg-surface rounded-xl border border-border-dim p-5 flex items-center justify-center">
            <p className="text-text-dim text-[12px]">No campaign data yet.</p>
          </div>
        )}
      </div>

      {/* Syncing toast — bottom left */}
      {syncing && (
        <div className="fixed bottom-5 left-5 md:left-[calc(13rem+1.25rem)] z-40 bg-accent rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 max-w-xs">
          <div className="w-4 h-4 border-2 border-accent-text border-t-transparent rounded-full animate-spin shrink-0" />
          <div>
            <p className="text-[13px] font-medium text-accent-text">Syncing your data</p>
            <p className="text-[11px] text-accent-text/70">This may take a couple minutes</p>
          </div>
        </div>
      )}
    </div>
  );
}
