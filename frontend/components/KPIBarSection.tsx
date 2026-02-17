'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { MoreVertical, Pencil, Trash2, Copy, Plus } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface KPIItem {
  event_name: string;
  property_name: string | null;
  property_value: string | null;
  item_type: 'count' | 'rate';
  label: string | null;
  rate_event_name: string | null;
  rate_property_name: string | null;
  rate_property_value: string | null;
  count: number;
  rate_count?: number;
}

interface DisplaySection {
  id: number;
  title: string;
  section_type: string;
  items: {
    event_name: string;
    property_name: string | null;
    property_value: string | null;
    item_type?: string;
    label?: string | null;
    rate_event_name?: string | null;
    rate_property_name?: string | null;
    rate_property_value?: string | null;
  }[];
}

interface Props {
  section: DisplaySection;
  startDate: string;
  endDate: string;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: (sectionType?: string) => void;
  onAddMarker?: () => void;
}

export default function KPIBarSection({ section, startDate, endDate, onEdit, onDelete, onDuplicate, onAddMarker }: Props) {
  const { user } = useUser();
  const [data, setData] = useState<KPIItem[]>([]);
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

  const formatValue = (item: KPIItem) => {
    if (item.item_type === 'rate') {
      const denominator = item.rate_count ?? 0;
      if (denominator === 0) return '0%';
      const rate = (item.count / denominator) * 100;
      return `${rate.toFixed(1)}%`;
    }
    return item.count.toLocaleString();
  };

  const getSubtitle = (item: KPIItem) => {
    if (item.item_type === 'rate') {
      return `${item.count.toLocaleString()} / ${(item.rate_count ?? 0).toLocaleString()}`;
    }
    return null;
  };

  const filledSlots = data.length;
  const emptySlots = Math.max(0, 4 - filledSlots);
  const showAddSlots = emptySlots > 0 && section.items.length < 4;

  return (
    <div className="bg-bg-surface rounded-xl border border-border-dim relative group">
      {/* Menu (top-right, visible on hover) */}
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
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
                onClick={() => { setMenuOpen(false); onDelete(); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-error hover:bg-bg-hover transition-colors"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-4 divide-x divide-border-dim/50">
        {loading ? (
          [...Array(section.items.length || 1)].map((_, i) => (
            <div key={i} className="px-5 py-5">
              <div className="h-3 bg-bg-elevated animate-pulse rounded w-16 mb-3" />
              <div className="h-7 bg-bg-elevated animate-pulse rounded w-20" />
            </div>
          ))
        ) : (
          <>
            {data.map((item, i) => (
              <div key={i} className="px-5 py-5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-text-dim mb-1.5">
                  {item.label || item.event_name}
                </p>
                <p className="text-[24px] font-bold tracking-tight text-text-heading leading-none">
                  {formatValue(item)}
                </p>
                {getSubtitle(item) && (
                  <p className="text-[11px] text-text-dim mt-1.5">{getSubtitle(item)}</p>
                )}
              </div>
            ))}
            {showAddSlots && (
              <button
                onClick={onAddMarker || onEdit}
                className="px-5 py-5 flex items-center justify-center gap-1.5 text-text-dim/40 hover:text-text-dim hover:bg-bg-hover/50 transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span className="text-[12px]">Add KPI</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
