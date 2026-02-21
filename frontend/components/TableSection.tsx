'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { MoreVertical, Pencil, Trash2, Copy, BarChart3 } from 'lucide-react';
import { apiFetch } from '@/lib/api';


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

export default function TableSection({ section, startDate, endDate, onEdit, onDelete, onDuplicate }: Props) {
  const { user } = useUser();
  const [data, setData] = useState<DisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ userId: user.id, startDate, endDate });
      const res = await apiFetch(`/api/event-display/sections/${section.id}/data?${params}`);
      const json = await res.json();
      if (res.ok) setData(json.data || []);
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

  const getLabel = (item: DisplayItem) => {
    if (item.property_value) return item.property_value;
    if (item.property_name) return `${item.event_name} (${item.property_name})`;
    return item.event_name;
  };

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
            <div className="absolute right-0 top-full mt-1 bg-bg-elevated border border-border-dim rounded-lg shadow-lg z-20 py-1 min-w-[120px]">
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
                onClick={() => { setMenuOpen(false); onDuplicate('bar'); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-text-body hover:bg-bg-hover transition-colors"
              >
                <BarChart3 size={12} /> Duplicate as Bar Chart
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

      {/* Table body */}
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
        ) : (
          <table className="w-full">
            <tbody>
              {data.map((item, i) => (
                <tr key={i} className="border-b border-border-dim/30 last:border-0">
                  <td className="py-2 text-[13px] text-text-body">{getLabel(item)}</td>
                  <td className="py-2 text-[13px] text-text-heading font-medium text-right tabular-nums">
                    {item.count.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
