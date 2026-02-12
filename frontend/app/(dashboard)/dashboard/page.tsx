'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import KPICard from '../../../components/KPICard';
import CampaignTable from '../../../components/CampaignTable';
import CountryBreakdown from '../../../components/CountryBreakdown';
import ProfitTrend from '../../../components/ProfitTrend';
import DateRangeSelector, { type DateRange } from '../../../components/DateRangeSelector';

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
}

interface Platform {
  totalSpend: number;
  campaigns: Campaign[];
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
  comparison?: Summary;
}

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function todayRange(): DateRange {
  const today = fmtDate(new Date());
  return { startDate: today, endDate: today };
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

/** Determine chart date range. If dashboard range < 7 days, chart shows 7d. Otherwise matches. */
function getChartRange(chartDays: number): { chartStartDate: string; chartEndDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - chartDays + 1);
  return { chartStartDate: fmtDate(start), chartEndDate: fmtDate(end) };
}

function getRangeDays(range: DateRange): number {
  const start = new Date(range.startDate + 'T00:00:00');
  const end = new Date(range.endDate + 'T00:00:00');
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(todayRange);
  const [chartDays, setChartDays] = useState(7);

  // If dashboard range >= 7 days, sync chart to match
  const dashboardDays = useMemo(() => getRangeDays(dateRange), [dateRange]);
  const effectiveChartDays = useMemo(() => {
    if (dashboardDays >= 7) return Math.max(chartDays, dashboardDays);
    return Math.max(chartDays, 7);
  }, [dashboardDays, chartDays]);

  // When dashboard range changes and is >= 7d, auto-update chart
  useEffect(() => {
    if (dashboardDays >= 7) {
      setChartDays(dashboardDays);
    }
  }, [dashboardDays]);

  const fetchMetrics = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const comp = getComparisonRange(dateRange);
      const chart = getChartRange(effectiveChartDays);

      const params = new URLSearchParams({
        userId: user.id,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        compareStartDate: comp.compareStartDate,
        compareEndDate: comp.compareEndDate,
        chartStartDate: chart.chartStartDate,
        chartEndDate: chart.chartEndDate,
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
  }, [user?.id, dateRange, effectiveChartDays]);

  useEffect(() => {
    if (!user?.id) return;
    fetchMetrics();
  }, [user?.id, fetchMetrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-dim text-[13px]">Loading metrics...</p>
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
  const comparison = data?.comparison;
  const platforms = data?.platforms || {};
  const countries = data?.countries || [];
  const timeSeries = data?.timeSeries || [];

  return (
    <div className="space-y-6">
      {/* Top bar: date range + compare badge */}
      <div className="flex items-center justify-between">
        <div /> {/* spacer */}
        <div className="flex items-center gap-2">
          <DateRangeSelector value={dateRange} onChange={setDateRange} compare />
        </div>
      </div>

      {/* 3 KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="Profit"
          value={`${summary.totalProfit >= 0 ? '+' : ''}$${summary.totalProfit.toLocaleString()}`}
          valueColor={summary.totalProfit >= 0 ? 'text-success' : 'text-error'}
          currentValue={summary.totalProfit}
          previousValue={comparison?.totalProfit}
        />
        <KPICard
          title="Revenue"
          value={`$${summary.totalRevenue.toLocaleString()}`}
          currentValue={summary.totalRevenue}
          previousValue={comparison?.totalRevenue}
        />
        <KPICard
          title="Ad Spend"
          value={`$${summary.totalSpend.toLocaleString()}`}
          currentValue={summary.totalSpend}
          previousValue={comparison?.totalSpend}
        />
      </div>

      {/* Profit trend chart */}
      <ProfitTrend
        data={timeSeries}
        chartDays={effectiveChartDays}
        onChartDaysChange={setChartDays}
      />

      {/* Countries + Campaigns side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CountryBreakdown countries={countries} />

        {Object.keys(platforms).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(platforms).map(([platform, pData]) => (
              <CampaignTable
                key={platform}
                platform={platform}
                totalSpend={pData.totalSpend}
                campaigns={pData.campaigns}
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
