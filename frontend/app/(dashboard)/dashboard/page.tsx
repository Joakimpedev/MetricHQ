'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import KPICard from '../../../components/KPICard';
import CampaignTable from '../../../components/CampaignTable';
import CountryBreakdown from '../../../components/CountryBreakdown';
import ProfitTrend from '../../../components/ProfitTrend';
import DateRangeSelector from '../../../components/DateRangeSelector';

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
}

function getDateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

export default function DashboardPage() {
  const { user } = useUser();
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState(30);

  const { startDate, endDate } = useMemo(() => getDateRange(rangeDays), [rangeDays]);

  const fetchMetrics = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        userId: user.id,
        startDate,
        endDate,
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
  }, [user?.id, startDate, endDate]);

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
  const platforms = data?.platforms || {};
  const countries = data?.countries || [];
  const timeSeries = data?.timeSeries || [];

  return (
    <div className="space-y-6">
      {/* Date range selector */}
      <div className="flex items-center justify-end">
        <DateRangeSelector selectedDays={rangeDays} onChange={setRangeDays} />
      </div>

      {/* 3 KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="Profit"
          value={`${summary.totalProfit >= 0 ? '+' : ''}$${summary.totalProfit.toLocaleString()}`}
          valueColor={summary.totalProfit >= 0 ? 'text-success' : 'text-error'}
          subtitle={`${summary.totalPurchases} purchases`}
        />
        <KPICard
          title="Revenue"
          value={`$${summary.totalRevenue.toLocaleString()}`}
        />
        <KPICard
          title="Ad Spend"
          value={`$${summary.totalSpend.toLocaleString()}`}
        />
      </div>

      {/* Profit trend chart */}
      <ProfitTrend data={timeSeries} />

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
