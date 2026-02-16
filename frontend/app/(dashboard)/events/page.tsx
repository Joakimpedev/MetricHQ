'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Plus, BarChart3, Plug } from 'lucide-react';
import DateRangeSelector, { type DateRange } from '../../../components/DateRangeSelector';
import AddEventSectionModal from '../../../components/AddEventSectionModal';

const EventSectionCard = dynamic(() => import('../../../components/EventSectionCard'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface EventSection {
  id: number;
  event_name: string;
  title: string | null;
  group_by_property: string | null;
  display_order: number;
}

function defaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

export default function EventsPage() {
  const { user } = useUser();
  const [sections, setSections] = useState<EventSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPostHog, setHasPostHog] = useState<boolean | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<EventSection | null>(null);

  const fetchSections = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ userId: user.id });
      const res = await fetch(`${API_URL}/api/custom-events/sections?${params}`);
      const json = await res.json();
      if (res.ok) {
        setSections(json.sections || []);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Check if PostHog is connected
  useEffect(() => {
    if (!user?.id) return;
    fetch(`${API_URL}/api/connections?userId=${encodeURIComponent(user.id)}`)
      .then(r => r.json())
      .then(j => {
        const connections = j.connections || {};
        setHasPostHog(!!connections.posthog?.connected);
      })
      .catch(() => setHasPostHog(false));
  }, [user?.id]);

  useEffect(() => { fetchSections(); }, [fetchSections]);

  const handleDelete = async (id: number) => {
    if (!user?.id) return;
    try {
      await fetch(`${API_URL}/api/custom-events/sections/${id}?userId=${encodeURIComponent(user.id)}`, { method: 'DELETE' });
      fetchSections();
    } catch {
      // silently ignore
    }
  };

  const handleEdit = (section: EventSection) => {
    setEditingSection(section);
    setModalOpen(true);
  };

  // PostHog not connected state
  if (hasPostHog === false) {
    return (
      <div className="max-w-[900px] mx-auto">
        <div className="bg-bg-surface rounded-xl border border-border-dim p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center">
            <Plug size={22} className="text-text-dim" />
          </div>
          <p className="text-text-dim text-[13px]">Connect PostHog to track custom events</p>
          <Link
            href="/integrations"
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-accent-text px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
          >
            Go to Integrations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Date range selector */}
      <div className="flex items-center justify-end mb-5">
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
      </div>

      {/* Sections */}
      {loading ? (
        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-bg-surface rounded-xl border border-border-dim p-5">
              <div className="h-4 bg-bg-elevated animate-pulse rounded-lg w-48 mb-4" />
              <div className="h-[280px] flex items-end gap-1 px-8">
                {Array.from({ length: 14 }).map((_, j) => (
                  <div
                    key={j}
                    className="flex-1 bg-bg-elevated animate-pulse rounded-t"
                    style={{ height: `${20 + Math.random() * 60}%` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : sections.length === 0 ? (
        <div className="bg-bg-surface rounded-xl border border-border-dim p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center">
            <BarChart3 size={22} className="text-text-dim" />
          </div>
          <p className="text-text-dim text-[13px]">No event trackers yet</p>
          <button
            onClick={() => { setEditingSection(null); setModalOpen(true); }}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-accent-text px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
          >
            <Plus size={15} />
            Add event tracker
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map(section => (
            <EventSectionCard
              key={section.id}
              section={section}
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onEdit={() => handleEdit(section)}
              onDelete={() => handleDelete(section.id)}
            />
          ))}

          {/* Add button at bottom */}
          <button
            onClick={() => { setEditingSection(null); setModalOpen(true); }}
            className="w-full flex items-center justify-center gap-1.5 border border-dashed border-border-dim rounded-xl py-4 text-[13px] font-medium text-text-dim hover:border-accent/50 hover:text-accent transition-colors"
          >
            <Plus size={15} />
            Add event tracker
          </button>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <AddEventSectionModal
          section={editingSection}
          onClose={() => { setModalOpen(false); setEditingSection(null); }}
          onSaved={() => { setModalOpen(false); setEditingSection(null); fetchSections(); }}
        />
      )}
    </div>
  );
}
