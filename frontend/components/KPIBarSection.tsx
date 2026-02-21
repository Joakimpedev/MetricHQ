'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { MoreVertical, Pencil, Trash2, Plus } from 'lucide-react';
import SingleKPIModal from './SingleKPIModal';
import { apiFetch } from '@/lib/api';


interface KPIItem {
  event_name: string;
  property_name: string | null;
  property_value: string | null;
  item_type: 'count' | 'rate' | 'cost_per';
  label: string | null;
  rate_event_name: string | null;
  rate_property_name: string | null;
  rate_property_value: string | null;
  count: number;
  rate_count?: number;
  total_spend?: number;
  cost_per_source?: 'revenue' | 'ad_spend';
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
  onSectionUpdated?: () => void;
}

export default function KPIBarSection({ section, startDate, endDate, onEdit, onDelete, onSectionUpdated }: Props) {
  const { user } = useUser();
  const [data, setData] = useState<KPIItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const [singleKpiModalOpen, setSingleKpiModalOpen] = useState(false);
  const [editingMarkerIndex, setEditingMarkerIndex] = useState<number | null>(null);

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

  useEffect(() => {
    if (openMenuIndex === null) return;
    const handler = () => setOpenMenuIndex(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openMenuIndex]);

  const formatValue = (item: KPIItem) => {
    // RevenueCat currency metrics
    if (item.event_name === '__rc:revenue' || item.event_name === '__rc:avg_revenue') {
      return `$${item.count.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (item.item_type === 'rate') {
      const denominator = item.count;
      const numerator = item.rate_count ?? 0;
      if (denominator === 0) return '0%';
      const rate = (numerator / denominator) * 100;
      return `${rate.toFixed(1)}%`;
    }
    if (item.item_type === 'cost_per') {
      const spend = item.total_spend ?? 0;
      if (item.count === 0) return '$0';
      const costPer = spend / item.count;
      return `$${costPer.toFixed(2)}`;
    }
    return item.count.toLocaleString();
  };

  const getSubtitle = (item: KPIItem) => {
    if (item.item_type === 'rate') {
      const converted = (item.rate_count ?? 0).toLocaleString();
      const total = item.count.toLocaleString();
      return `${converted} / ${total}`;
    }
    if (item.item_type === 'cost_per') {
      const amount = item.total_spend ?? 0;
      const sourceLabel = item.cost_per_source === 'revenue' ? 'revenue' : 'spend';
      return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${sourceLabel} / ${item.count.toLocaleString()} events`;
    }
    return null;
  };

  const handleDeleteMarker = async (markerIndex: number) => {
    if (!user?.id) return;
    const updatedItems = section.items.filter((_, i) => i !== markerIndex);

    // If no markers left, delete the whole section
    if (updatedItems.length === 0) {
      onDelete();
      return;
    }

    try {
      await apiFetch(`/api/event-display/sections/${section.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: section.title,
          items: updatedItems,
        }),
      });
      onSectionUpdated?.();
    } catch {
      // silently ignore
    }
  };

  const filledSlots = data.length;
  const showAddSlot = filledSlots < 4 && section.items.length < 4;

  return (
    <div className="bg-bg-surface rounded-xl border border-border-dim">
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
              <div key={i} className="px-5 py-5 relative group/marker">
                {/* Per-marker menu */}
                <div className="absolute top-2 right-2 opacity-0 group-hover/marker:opacity-100 transition-opacity">
                  <div className="relative">
                    <button
                      onClick={e => { e.stopPropagation(); setOpenMenuIndex(openMenuIndex === i ? null : i); }}
                      className="p-1 rounded hover:bg-bg-elevated transition-colors text-text-dim hover:text-text-heading"
                    >
                      <MoreVertical size={13} />
                    </button>
                    {openMenuIndex === i && (
                      <div className="absolute right-0 top-full mt-1 bg-bg-elevated border border-border-dim rounded-lg shadow-lg z-20 py-1 min-w-[100px]">
                        <button
                          onClick={() => { setOpenMenuIndex(null); setEditingMarkerIndex(i); setSingleKpiModalOpen(true); }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-text-body hover:bg-bg-hover transition-colors"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          onClick={() => { setOpenMenuIndex(null); handleDeleteMarker(i); }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-error hover:bg-bg-hover transition-colors"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

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
            {showAddSlot && (
              <button
                onClick={() => { setEditingMarkerIndex(null); setSingleKpiModalOpen(true); }}
                className="px-5 py-5 flex items-center justify-center gap-1.5 text-text-dim/40 hover:text-text-dim hover:bg-bg-hover/50 transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span className="text-[12px]">Add KPI</span>
              </button>
            )}
          </>
        )}
      </div>
      {singleKpiModalOpen && (
        <SingleKPIModal
          section={section}
          markerIndex={editingMarkerIndex}
          onClose={() => setSingleKpiModalOpen(false)}
          onSaved={() => {
            setSingleKpiModalOpen(false);
            onSectionUpdated?.();
          }}
        />
      )}
    </div>
  );
}
