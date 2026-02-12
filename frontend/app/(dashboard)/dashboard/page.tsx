'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { RefreshCw } from 'lucide-react';
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

interface SyncStatus {
  lastSynced: string | null;
  isSyncing: boolean;
  platforms: Record<string, { status: string; lastSynced: string | null; error: string | null }>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

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

  const fetchSyncStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const params = new URLSearchParams({ userId: user.id });
      const res = await fetch(`${API_URL}/api/sync/status?${params}`);
      if (res.ok) {
        const json = await res.json();
        setSyncStatus(json);
        setSyncing(json.isSyncing);
      }
    } catch {
      // Silently ignore sync status errors
    }
  }, [user?.id]);

  const handleRefresh = async () => {
    if (!user?.id || syncing) return;
    setSyncing(true);
    try {
      await fetch(`${API_URL}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      // Wait a few seconds for sync to process, then re-fetch
      setTimeout(async () => {
        await fetchMetrics();
        await fetchSyncStatus();
        setSyncing(false);
      }, 5000);
    } catch {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchMetrics();
    fetchSyncStatus();
  }, [user?.id, fetchMetrics, fetchSyncStatus]);

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
    <div className="max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-bold text-text-heading">Dashboard</h1>
        <div className="flex items-center gap-2">
          {syncStatus?.lastSynced && (
            <span className="text-text-dim text-[12px]">
              Last synced {timeAgo(syncStatus.lastSynced)}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={syncing}
            className="p-1.5 rounded-md hover:bg-bg-hover text-text-dim hover:text-text-heading transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2 Hero KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <KPICard
          title="Total Profit"
          value={`${summary.totalProfit >= 0 ? '+' : ''}$${summary.totalProfit.toLocaleString()}`}
          valueColor={summary.totalProfit >= 0 ? 'text-success' : 'text-error'}
          subtitle={`${summary.totalPurchases} purchases · $${summary.cpa} CPA`}
        />
        <KPICard
          title="Ad Spend"
          value={`$${summary.totalSpend.toLocaleString()}`}
          subtitle={`$${summary.totalRevenue.toLocaleString()} revenue`}
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
