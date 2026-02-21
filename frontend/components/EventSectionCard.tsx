'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { apiFetch } from '@/lib/api';


interface EventSection {
  id: number;
  event_name: string;
  title: string | null;
  group_by_property: string | null;
  display_order: number;
}

interface CacheRow {
  date: string;
  property_value: string;
  count: number;
}

interface EventSectionCardProps {
  section: EventSection;
  startDate: string;
  endDate: string;
  onEdit: () => void;
  onDelete: () => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// OKLCH-based colors for stacked bars — consistent perceived brightness
function getOklchColor(index: number): string {
  const hue = (index * 32 + 220) % 360;
  return `oklch(0.65 0.15 ${hue})`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-bg-elevated border border-border-dim rounded-lg px-3 py-2 shadow-lg min-w-[120px]">
      <p className="text-[11px] text-text-dim mb-1.5">{label ? formatDate(label) : ''}</p>
      <div className="space-y-1">
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex justify-between gap-4">
            <span className="text-[11px] text-text-dim flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: entry.color }} />
              {entry.dataKey === '_total' ? 'Total' : entry.dataKey}
            </span>
            <span className="text-[12px] font-medium text-text-body tabular-nums">
              {entry.value?.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EventSectionCard({ section, startDate, endDate, onEdit, onDelete }: EventSectionCardProps) {
  const { user } = useUser();
  const [data, setData] = useState<CacheRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        userId: user.id,
        startDate,
        endDate,
      });
      const res = await apiFetch(`/api/custom-events/sections/${section.id}/data?${params}`);
      const json = await res.json();
      if (res.ok) {
        setData(json.data || []);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [user?.id, section.id, startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuOpen]);

  // Process data for chart
  const { chartData, propertyKeys, isGrouped } = useMemo(() => {
    if (data.length === 0) return { chartData: [], propertyKeys: [], isGrouped: false };

    const hasGrouped = data.some(r => r.property_value !== '_total');

    if (!hasGrouped) {
      // Simple ungrouped: date -> count
      const byDate: Record<string, number> = {};
      for (const row of data) {
        const d = String(row.date).slice(0, 10);
        byDate[d] = (byDate[d] || 0) + row.count;
      }
      const sorted = Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, _total: count }));
      return { chartData: sorted, propertyKeys: ['_total'], isGrouped: false };
    }

    // Grouped: date -> { prop1: count, prop2: count, ... }
    const grouped = data.filter(r => r.property_value !== '_total');
    const dateMap: Record<string, Record<string, number>> = {};
    const propTotals: Record<string, number> = {};

    for (const row of grouped) {
      const d = String(row.date).slice(0, 10);
      if (!dateMap[d]) dateMap[d] = {};
      dateMap[d][row.property_value] = (dateMap[d][row.property_value] || 0) + row.count;
      propTotals[row.property_value] = (propTotals[row.property_value] || 0) + row.count;
    }

    // Top property values by total count
    const topProps = Object.entries(propTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k]) => k);

    const sorted = Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, props]) => {
        const point: Record<string, unknown> = { date };
        for (const prop of topProps) {
          point[prop] = props[prop] || 0;
        }
        return point;
      });

    return { chartData: sorted, propertyKeys: topProps, isGrouped: true };
  }, [data]);

  const displayTitle = section.title || section.event_name;

  return (
    <div className="bg-bg-surface rounded-xl border border-border-dim">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-dim/50">
        <div>
          <h3 className="text-[14px] font-semibold text-text-heading">{displayTitle}</h3>
          {section.group_by_property && (
            <p className="text-[11px] text-text-dim mt-0.5">
              Grouped by {section.group_by_property}
            </p>
          )}
        </div>
        <div className="relative">
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="p-1 rounded hover:bg-bg-elevated transition-colors text-text-dim hover:text-text-heading"
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-bg-elevated border border-border-dim rounded-lg shadow-lg z-20 py-1 min-w-[120px]">
              <button
                onClick={() => { setMenuOpen(false); onEdit(); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-text-body hover:bg-bg-hover transition-colors"
              >
                <Pencil size={12} /> Edit
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDelete(); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-error hover:bg-bg-hover transition-colors"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chart body */}
      <div className="px-5 py-4">
        {loading ? (
          // Skeleton
          <div className="h-[280px] flex items-end gap-1 px-8">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-bg-elevated animate-pulse rounded-t"
                style={{ height: `${20 + Math.random() * 60}%` }}
              />
            ))}
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center">
            <p className="text-text-dim text-[12px]">No data yet. Data will appear after the next sync.</p>
          </div>
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dim)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11, fill: 'var(--text-dim)' }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-dim)' }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={4}
                  width={40}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                />
                <Tooltip content={<CustomTooltip />} />
                {isGrouped && propertyKeys.length > 1 && (
                  <Legend
                    wrapperStyle={{ fontSize: '11px', color: 'var(--text-dim)' }}
                    iconType="square"
                    iconSize={8}
                  />
                )}
                {propertyKeys.map((key, i) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId={isGrouped ? 'stack' : undefined}
                    fill={isGrouped ? getOklchColor(i) : 'var(--accent)'}
                    radius={isGrouped && i === propertyKeys.length - 1 ? [2, 2, 0, 0] : (isGrouped ? [0, 0, 0, 0] : [2, 2, 0, 0])}
                    name={key === '_total' ? 'Total' : key}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
