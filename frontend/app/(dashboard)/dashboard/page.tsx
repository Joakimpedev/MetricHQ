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
    countryCampaigns: {
      US: [
        { platform: 'google_ads', campaign: 'Brand Search US', spend: Math.round(totalSpend * 0.18), revenue: Math.round(totalRevenue * 0.22), impressions: 9800, clicks: 620, purchases: Math.round(totalPurchases * 0.15) },
        { platform: 'meta', campaign: 'Lookalike - US SaaS Founders', spend: Math.round(totalSpend * 0.12), revenue: Math.round(totalRevenue * 0.15), impressions: 15400, clicks: 310, purchases: Math.round(totalPurchases * 0.12) },
        { platform: 'tiktok', campaign: 'SaaS Demo Signups', spend: Math.round(totalSpend * 0.08), revenue: Math.round(totalRevenue * 0.06), impressions: 38000, clicks: 680, purchases: Math.round(totalPurchases * 0.06) },
        { platform: 'meta', campaign: 'Retargeting - Site Visitors', spend: Math.round(totalSpend * 0.07), revenue: Math.round(totalRevenue * 0.07), impressions: 6200, clicks: 250, purchases: Math.round(totalPurchases * 0.07) },
      ],
      GB: [
        { platform: 'google_ads', campaign: 'Brand Search US', spend: Math.round(totalSpend * 0.06), revenue: Math.round(totalRevenue * 0.08), impressions: 3200, clicks: 180, purchases: Math.round(totalPurchases * 0.08) },
        { platform: 'meta', campaign: 'Lookalike - US SaaS Founders', spend: Math.round(totalSpend * 0.07), revenue: Math.round(totalRevenue * 0.07), impressions: 4800, clicks: 95, purchases: Math.round(totalPurchases * 0.06) },
        { platform: 'tiktok', campaign: 'Founder Testimonials', spend: Math.round(totalSpend * 0.05), revenue: Math.round(totalRevenue * 0.05), impressions: 22000, clicks: 410, purchases: Math.round(totalPurchases * 0.06) },
      ],
      DE: [
        { platform: 'google_ads', campaign: 'Brand Search US', spend: Math.round(totalSpend * 0.04), revenue: Math.round(totalRevenue * 0.05), impressions: 2100, clicks: 120, purchases: Math.round(totalPurchases * 0.06) },
        { platform: 'meta', campaign: 'Lookalike - US SaaS Founders', spend: Math.round(totalSpend * 0.05), revenue: Math.round(totalRevenue * 0.04), impressions: 3500, clicks: 72, purchases: Math.round(totalPurchases * 0.05) },
        { platform: 'tiktok', campaign: 'SaaS Demo Signups', spend: Math.round(totalSpend * 0.03), revenue: Math.round(totalRevenue * 0.03), impressions: 18000, clicks: 340, purchases: Math.round(totalPurchases * 0.04) },
      ],
      NO: [
        { platform: 'google_ads', campaign: 'Brand Search US', spend: Math.round(totalSpend * 0.03), revenue: Math.round(totalRevenue * 0.05), impressions: 1400, clicks: 85, purchases: Math.round(totalPurchases * 0.05) },
        { platform: 'meta', campaign: 'Retargeting - Site Visitors', spend: Math.round(totalSpend * 0.05), revenue: Math.round(totalRevenue * 0.05), impressions: 2800, clicks: 68, purchases: Math.round(totalPurchases * 0.05) },
      ],
      CA: [
        { platform: 'google_ads', campaign: 'Competitor Keywords', spend: Math.round(totalSpend * 0.05), revenue: 0, impressions: 2800, clicks: 95, purchases: 0 },
        { platform: 'meta', campaign: 'Lookalike - US SaaS Founders', spend: Math.round(totalSpend * 0.03), revenue: Math.round(totalRevenue * 0.03), impressions: 2200, clicks: 48, purchases: Math.round(totalPurchases * 0.05) },
        { platform: 'tiktok', campaign: 'SaaS Demo Signups', spend: Math.round(totalSpend * 0.02), revenue: Math.round(totalRevenue * 0.02), impressions: 12000, clicks: 220, purchases: Math.round(totalPurchases * 0.03) },
      ],
      AU: [
        { platform: 'google_ads', campaign: 'Display Retargeting', spend: Math.round(totalSpend * 0.04), revenue: 0, impressions: 8500, clicks: 120, purchases: 0 },
        { platform: 'meta', campaign: 'Retargeting - Site Visitors', spend: Math.round(totalSpend * 0.03), revenue: Math.round(totalRevenue * 0.03), impressions: 1800, clicks: 42, purchases: Math.round(totalPurchases * 0.07) },
      ],
    },
    platforms: {
      google_ads: {
        totalSpend: Math.round(totalSpend * 0.4),
        totalRevenue: Math.round(totalRevenue * 0.3),
        campaigns: [
          { campaignId: 'Brand Search US', spend: Math.round(totalSpend * 0.18), impressions: 14200, clicks: 890, revenue: Math.round(totalRevenue * 0.3), purchases: Math.round(totalPurchases * 0.25), profit: Math.round(totalRevenue * 0.3) - Math.round(totalSpend * 0.18), attributed: true },
          { campaignId: 'Competitor Keywords', spend: Math.round(totalSpend * 0.12), impressions: 8400, clicks: 320, revenue: 0, purchases: 0, profit: -Math.round(totalSpend * 0.12), attributed: false },
          { campaignId: 'Display Retargeting', spend: Math.round(totalSpend * 0.1), impressions: 42000, clicks: 580, revenue: 0, purchases: 0, profit: -Math.round(totalSpend * 0.1), attributed: false },
        ],
      },
      meta: {
        totalSpend: Math.round(totalSpend * 0.25),
        totalRevenue: Math.round(totalRevenue * 0.3),
        campaigns: [
          { campaignName: 'Lookalike - US SaaS Founders', spend: Math.round(totalSpend * 0.15), impressions: 22000, clicks: 440, revenue: Math.round(totalRevenue * 0.18), purchases: Math.round(totalPurchases * 0.18), profit: Math.round(totalRevenue * 0.18) - Math.round(totalSpend * 0.15), attributed: true },
          { campaignName: 'Retargeting - Site Visitors', spend: Math.round(totalSpend * 0.1), impressions: 9500, clicks: 380, revenue: Math.round(totalRevenue * 0.12), purchases: Math.round(totalPurchases * 0.12), profit: Math.round(totalRevenue * 0.12) - Math.round(totalSpend * 0.1), attributed: true },
        ],
      },
      tiktok: {
        totalSpend: Math.round(totalSpend * 0.2),
        totalRevenue: Math.round(totalRevenue * 0.1),
        campaigns: [
          { campaignName: 'SaaS Demo Signups', spend: Math.round(totalSpend * 0.12), impressions: 68000, clicks: 1200, revenue: Math.round(totalRevenue * 0.07), purchases: Math.round(totalPurchases * 0.06), profit: Math.round(totalRevenue * 0.07) - Math.round(totalSpend * 0.12), attributed: true },
          { campaignName: 'Founder Testimonials', spend: Math.round(totalSpend * 0.08), impressions: 45000, clicks: 820, revenue: Math.round(totalRevenue * 0.03), purchases: Math.round(totalPurchases * 0.03), profit: Math.round(totalRevenue * 0.03) - Math.round(totalSpend * 0.08), attributed: true },
        ],
      },
      linkedin: {
        totalSpend: Math.round(totalSpend * 0.15),
        totalRevenue: Math.round(totalRevenue * 0.15),
        campaigns: [
          { campaignId: 'B2B Decision Makers', spend: Math.round(totalSpend * 0.09), impressions: 6200, clicks: 95, revenue: Math.round(totalRevenue * 0.1), purchases: Math.round(totalPurchases * 0.08), profit: Math.round(totalRevenue * 0.1) - Math.round(totalSpend * 0.09), attributed: true },
          { campaignId: 'SaaS Founders - EU', spend: Math.round(totalSpend * 0.06), impressions: 3800, clicks: 62, revenue: Math.round(totalRevenue * 0.05), purchases: Math.round(totalPurchases * 0.04), profit: Math.round(totalRevenue * 0.05) - Math.round(totalSpend * 0.06), attributed: true },
        ],
      },
    },
    unattributedRevenue: Math.round(totalRevenue * 0.15),
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
