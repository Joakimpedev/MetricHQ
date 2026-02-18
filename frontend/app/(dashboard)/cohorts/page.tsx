'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useCurrency } from '../../../lib/currency';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// Day milestones to show as columns
const DAY_MILESTONES = [0, 7, 14, 21, 28];

interface CohortDayData {
  [day: string]: { revenue: number; users: number };
}

interface CohortEntry {
  date: string;
  spend: number;
  subscribers: number;
  cac: number | null;
  dayRevenue: CohortDayData;
  cumulativeRevenue: { [day: string]: number };
  currentROAS: number | null;
}

interface CohortResponse {
  cohorts: CohortEntry[];
  startDate: string;
  endDate: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getRoasColor(roas: number | null): string {
  if (roas === null) return '';
  if (roas >= 1.5) return 'text-green-400';
  if (roas >= 1.0) return 'text-green-300';
  if (roas >= 0.7) return 'text-yellow-400';
  return 'text-red-400';
}

function getCellBg(roas: number | null): string {
  if (roas === null) return '';
  if (roas >= 1.5) return 'bg-green-500/10';
  if (roas >= 1.0) return 'bg-green-500/5';
  if (roas >= 0.7) return 'bg-yellow-500/5';
  return 'bg-red-500/5';
}

export default function CohortsPage() {
  const { user } = useUser();
  const { formatCurrency } = useCurrency();
  const [data, setData] = useState<CohortResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysBack, setDaysBack] = useState(14);

  const fetchCohorts = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    const endDate = new Date().toISOString().slice(0, 10);
    const startD = new Date();
    startD.setDate(startD.getDate() - daysBack);
    const startDate = startD.toISOString().slice(0, 10);

    try {
      const params = new URLSearchParams({ userId: user.id, startDate, endDate });
      const res = await fetch(`${API_URL}/api/cohorts?${params}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to fetch cohort data');
      }
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cohort data');
    } finally {
      setLoading(false);
    }
  }, [user?.id, daysBack]);

  useEffect(() => {
    fetchCohorts();
  }, [fetchCohorts]);

  // Calculate the max day we actually have data for
  const maxAvailableDay = data?.cohorts.reduce((max, c) => {
    const days = Object.keys(c.cumulativeRevenue).map(Number);
    return Math.max(max, ...days);
  }, 0) || 0;

  // Only show milestones that have at least some data
  const visibleMilestones = DAY_MILESTONES.filter(d => d <= maxAvailableDay + 7);
  // Always show at least Day 0
  if (visibleMilestones.length === 0) visibleMilestones.push(0);

  // Summary stats
  const totalSpend = data?.cohorts.reduce((sum, c) => sum + c.spend, 0) || 0;
  const totalSubs = data?.cohorts.reduce((sum, c) => sum + c.subscribers, 0) || 0;
  const avgCac = totalSubs > 0 ? totalSpend / totalSubs : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-dim text-[13px]">
            Track how each day&apos;s subscribers pay back their acquisition cost over time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => setDaysBack(d)}
              className={`px-3 py-1.5 text-[12px] rounded-md transition-colors ${
                daysBack === d
                  ? 'bg-accent text-accent-text font-medium'
                  : 'bg-bg-card text-text-dim hover:text-text-body border border-border-dim'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-bg-card border border-border-dim rounded-lg p-4">
          <div className="text-text-dim text-[11px] uppercase tracking-wider mb-1">Total Ad Spend</div>
          <div className="text-text-heading text-[20px] font-semibold">{formatCurrency(totalSpend)}</div>
        </div>
        <div className="bg-bg-card border border-border-dim rounded-lg p-4">
          <div className="text-text-dim text-[11px] uppercase tracking-wider mb-1">New Subscribers</div>
          <div className="text-text-heading text-[20px] font-semibold">{totalSubs}</div>
        </div>
        <div className="bg-bg-card border border-border-dim rounded-lg p-4">
          <div className="text-text-dim text-[11px] uppercase tracking-wider mb-1">Avg CAC</div>
          <div className="text-text-heading text-[20px] font-semibold">{avgCac > 0 ? formatCurrency(avgCac) : '--'}</div>
        </div>
      </div>

      {/* Cohort Table */}
      <div className="bg-bg-card border border-border-dim rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-text-dim text-[13px]">Loading cohort data...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="text-red-400 text-[13px] mb-2">{error}</div>
                <button onClick={fetchCohorts} className="text-accent text-[12px] hover:underline">
                  Try again
                </button>
              </div>
            </div>
          ) : !data || data.cohorts.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="text-text-dim text-[13px] mb-1">No cohort data yet</div>
                <div className="text-text-dim text-[12px]">Purchase events will appear here once PostHog receives them.</div>
              </div>
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border-dim">
                  <th className="text-left text-text-dim font-medium px-4 py-3 whitespace-nowrap">Cohort Date</th>
                  <th className="text-right text-text-dim font-medium px-4 py-3 whitespace-nowrap">Ad Spend</th>
                  <th className="text-right text-text-dim font-medium px-4 py-3 whitespace-nowrap">Subs</th>
                  <th className="text-right text-text-dim font-medium px-4 py-3 whitespace-nowrap">CAC</th>
                  {visibleMilestones.map(d => (
                    <th key={d} className="text-right text-text-dim font-medium px-4 py-3 whitespace-nowrap">
                      Day {d} Rev
                    </th>
                  ))}
                  {visibleMilestones.map(d => (
                    <th key={`roas-${d}`} className="text-right text-text-dim font-medium px-4 py-3 whitespace-nowrap">
                      Day {d} ROAS
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.cohorts.map((cohort) => {
                  return (
                    <tr key={cohort.date} className="border-b border-border-dim/50 hover:bg-bg-hover/50 transition-colors">
                      <td className="px-4 py-3 text-text-heading font-medium whitespace-nowrap">
                        {formatDate(cohort.date)}
                      </td>
                      <td className="px-4 py-3 text-right text-text-body whitespace-nowrap">
                        {cohort.spend > 0 ? formatCurrency(cohort.spend) : '--'}
                      </td>
                      <td className="px-4 py-3 text-right text-text-body whitespace-nowrap">
                        {cohort.subscribers || '--'}
                      </td>
                      <td className="px-4 py-3 text-right text-text-body whitespace-nowrap">
                        {cohort.cac !== null ? formatCurrency(cohort.cac) : '--'}
                      </td>
                      {visibleMilestones.map(d => {
                        const cumRev = cohort.cumulativeRevenue[d];
                        // Check if this day has happened yet
                        const cohortAge = Math.floor((Date.now() - new Date(cohort.date + 'T00:00:00').getTime()) / 86400000);
                        const hasData = cumRev !== undefined && d <= cohortAge;
                        return (
                          <td key={d} className="px-4 py-3 text-right text-text-body whitespace-nowrap">
                            {hasData ? formatCurrency(cumRev) : (
                              <span className="text-text-dim/40">--</span>
                            )}
                          </td>
                        );
                      })}
                      {visibleMilestones.map(d => {
                        const cumRev = cohort.cumulativeRevenue[d];
                        const cohortAge = Math.floor((Date.now() - new Date(cohort.date + 'T00:00:00').getTime()) / 86400000);
                        const hasData = cumRev !== undefined && d <= cohortAge;
                        const roas = hasData && cohort.spend > 0 ? cumRev / cohort.spend : null;
                        return (
                          <td key={`roas-${d}`} className={`px-4 py-3 text-right whitespace-nowrap ${getCellBg(roas)}`}>
                            {roas !== null ? (
                              <span className={`font-medium ${getRoasColor(roas)}`}>
                                {roas.toFixed(2)}x
                              </span>
                            ) : (
                              <span className="text-text-dim/40">--</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Legend / Help */}
      <div className="bg-bg-card border border-border-dim rounded-lg p-4">
        <div className="text-text-dim text-[12px] space-y-1">
          <p><span className="text-green-400 font-medium">Green</span> = ROAS above 1.0x (profitable)</p>
          <p><span className="text-yellow-400 font-medium">Yellow</span> = ROAS 0.7-1.0x (close to breakeven)</p>
          <p><span className="text-red-400 font-medium">Red</span> = ROAS below 0.7x (unprofitable so far)</p>
          <p className="pt-1 text-text-dim/80">Day N Revenue = cumulative revenue from that cohort&apos;s subscribers through day N. ROAS = cumulative revenue / ad spend for that day.</p>
        </div>
      </div>
    </div>
  );
}
