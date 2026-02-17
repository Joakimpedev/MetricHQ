'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { MoreVertical, Pencil, Trash2, Copy, Table } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface DisplayItem {
  event_name: string;
  property_name: string | null;
  property_value: string | null;
  display_order: number;
  count: number;
}

interface DisplaySection {
  id: number;
  title: string;
  section_type: string;
  items: { event_name: string; property_name: string | null; property_value: string | null }[];
}

interface Props {
  section: DisplaySection;
  startDate: string;
  endDate: string;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: (sectionType?: string) => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-bg-elevated border border-border-dim rounded-lg px-3 py-2 shadow-lg">
      <p className="text-[11px] text-text-dim mb-0.5">{item.payload.label}</p>
      <p className="text-[13px] font-medium text-text-heading">{item.value.toLocaleString()}</p>
    </div>
  );
}

export default function BarChartSection({ section, startDate, endDate, onEdit, onDelete, onDuplicate }: Props) {
  const { user } = useUser();
  const [data, setData] = useState<DisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ userId: user.id, startDate, endDate });
      const res = await fetch(`${API_URL}/api/event-display/sections/${section.id}/data?${params}`);
      const json = await res.json();
      if (res.ok) setData(json.data || []);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [user?.id, section.id, startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuOpen]);

  const getLabel = (item: DisplayItem) => {
    if (item.property_value) return item.property_value;
    if (item.property_name) return `${item.event_name} (${item.property_name})`;
    return item.event_name;
  };

  const chartData = data.map(item => ({
    label: getLabel(item),
    count: item.count,
  }));

  // Use vertical bars only when there are 100+ items
  const useVerticalBars = chartData.length >= 100;

  return (
    <div className="bg-bg-surface rounded-xl border border-border-dim">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-dim/50">
        <h3 className="text-[14px] font-semibold text-text-heading">{section.title}</h3>
        <div className="relative">
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="p-1 rounded hover:bg-bg-elevated transition-colors text-text-dim hover:text-text-heading"
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-bg-elevated border border-border-dim rounded-lg shadow-lg z-20 py-1 min-w-[160px]">
              <button
                onClick={() => { setMenuOpen(false); onEdit(); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-text-body hover:bg-bg-hover transition-colors"
              >
                <Pencil size={12} /> Edit
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDuplicate(); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-text-body hover:bg-bg-hover transition-colors"
              >
                <Copy size={12} /> Duplicate
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDuplicate('table'); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-text-body hover:bg-bg-hover transition-colors"
              >
                <Table size={12} /> Duplicate as Table
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
      <div className="px-5 py-3">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between py-2">
                <div className="h-3.5 bg-bg-elevated animate-pulse rounded w-32" />
                <div className="h-3.5 bg-bg-elevated animate-pulse rounded w-12" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <p className="text-text-dim text-[12px] py-4 text-center">No data yet</p>
        ) : useVerticalBars ? (
          /* Vertical bars (horizontal layout) for 40+ items */
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 12, bottom: 40, left: 4 }}>
                <XAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'var(--text-dim)' }}
                  axisLine={false}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  height={60}
                />
                <YAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-hover)', opacity: 0.5 }} />
                <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* Horizontal bars (default) */
          <div style={{ width: '100%', height: Math.max(200, chartData.length * 40 + 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 12, fill: 'var(--text-body)' }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-hover)', opacity: 0.5 }} />
                <Bar dataKey="count" fill="var(--accent)" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
