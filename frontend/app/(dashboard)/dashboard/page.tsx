'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { DollarSign, Receipt, Megaphone, Target } from 'lucide-react';
import KPICard from '../../../components/KPICard';
import CampaignTable from '../../../components/CampaignTable';
import CountryBreakdown from '../../../components/CountryBreakdown';

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

interface MetricsData {
  summary: Summary;
  platforms: Record<string, Platform>;
  countries: Country[];
}

export default function DashboardPage() {
  const { user } = useUser();
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ userId: user.id });
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
  }, [user?.id]);

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

  return (
    <div className="space-y-6">
      {/* 4 KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard
          title="Total Profit"
          icon={DollarSign}
          value={`${summary.totalProfit >= 0 ? '+' : ''}$${summary.totalProfit.toLocaleString()}`}
          valueColor={summary.totalProfit >= 0 ? 'text-success' : 'text-error'}
          subtitle={`${summary.totalPurchases} purchases`}
        />
        <KPICard
          title="Revenue"
          icon={Receipt}
          value={`$${summary.totalRevenue.toLocaleString()}`}
        />
        <KPICard
          title="Ad Spend"
          icon={Megaphone}
          value={`$${summary.totalSpend.toLocaleString()}`}
        />
        <KPICard
          title="CPA"
          icon={Target}
          value={`$${summary.cpa.toLocaleString()}`}
          subtitle="Cost per acquisition"
        />
      </div>

      {/* Countries */}
      <CountryBreakdown countries={countries} />

      {/* Campaigns */}
      {Object.keys(platforms).length > 0 && (
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
      )}
    </div>
  );
}
