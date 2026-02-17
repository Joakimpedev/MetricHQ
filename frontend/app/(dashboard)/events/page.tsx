'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { Plus, Plug, RefreshCw, BarChart3, Trash2 } from 'lucide-react';
import DateRangeSelector, { type DateRange } from '../../../components/DateRangeSelector';
import AddEventSectionModal from '../../../components/AddEventSectionModal';
import AddDisplaySectionModal from '../../../components/AddDisplaySectionModal';
import TableSection from '../../../components/TableSection';
import BarChartSection from '../../../components/BarChartSection';
import KPIBarSection from '../../../components/KPIBarSection';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface EventSection {
  id: number;
  event_name: string;
  title: string | null;
  group_by_property: string | null;
  property_value_contains: string | null;
  display_order: number;
}

interface DisplaySection {
  id: number;
  title: string;
  section_type: string;
  items: { event_name: string; property_name: string | null; property_value: string | null }[];
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
  const [displaySections, setDisplaySections] = useState<DisplaySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPostHog, setHasPostHog] = useState<boolean | null>(null);
  const [dateRange, setDateRangeRaw] = useState<DateRange>(() => {
    try {
      const saved = sessionStorage.getItem('metrichq-date-range');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.startDate && parsed.endDate) return parsed;
      }
    } catch { /* ignore */ }
    return defaultDateRange();
  });
  const setDateRange = (range: DateRange) => {
    setDateRangeRaw(range);
    try { sessionStorage.setItem('metrichq-date-range', JSON.stringify(range)); } catch { /* ignore */ }
  };
  const [trackerModalOpen, setTrackerModalOpen] = useState(false);
  const [editingTracker, setEditingTracker] = useState<EventSection | null>(null);
  const [displayModalOpen, setDisplayModalOpen] = useState(false);
  const [editingDisplay, setEditingDisplay] = useState<DisplaySection | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSync = async () => {
    if (!user?.id || syncing) return;
    setSyncing(true);
    try {
      await fetch(`${API_URL}/api/custom-events/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      await fetchSections();
      await fetchDisplaySections();
      setRefreshKey(k => k + 1);
    } catch {
      // silently ignore
    } finally {
      setSyncing(false);
    }
  };

  const fetchSections = useCallback(async () => {
    if (!user?.id) return;
    try {
      const params = new URLSearchParams({ userId: user.id });
      const res = await fetch(`${API_URL}/api/custom-events/sections?${params}`);
      const json = await res.json();
      if (res.ok) setSections(json.sections || []);
    } catch {
      // silently ignore
    }
  }, [user?.id]);

  const fetchDisplaySections = useCallback(async () => {
    if (!user?.id) return;
    try {
      const params = new URLSearchParams({ userId: user.id });
      const res = await fetch(`${API_URL}/api/event-display/sections?${params}`);
      const json = await res.json();
      if (res.ok) setDisplaySections(json.sections || []);
    } catch {
      // silently ignore
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

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchSections(), fetchDisplaySections()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchSections, fetchDisplaySections]);

  const handleDeleteTracker = async (id: number) => {
    if (!user?.id) return;
    try {
      await fetch(`${API_URL}/api/custom-events/sections/${id}?userId=${encodeURIComponent(user.id)}`, { method: 'DELETE' });
      fetchSections();
    } catch {
      // silently ignore
    }
  };

  const handleDeleteDisplay = async (id: number) => {
    if (!user?.id) return;
    try {
      await fetch(`${API_URL}/api/event-display/sections/${id}?userId=${encodeURIComponent(user.id)}`, { method: 'DELETE' });
      fetchDisplaySections();
    } catch {
      // silently ignore
    }
  };

  const handleDuplicate = async (id: number, sectionType?: string) => {
    if (!user?.id) return;
    try {
      const body: Record<string, string> = { userId: user.id };
      if (sectionType) body.section_type = sectionType;
      await fetch(`${API_URL}/api/event-display/sections/${id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      fetchDisplaySections();
    } catch {
      // silently ignore
    }
  };

  const handleDeleteAll = async () => {
    if (!user?.id) return;
    if (!confirm('Delete all event trackers, display sections, and cached data? This cannot be undone.')) return;
    try {
      await fetch(`${API_URL}/api/custom-events/all?userId=${encodeURIComponent(user.id)}`, { method: 'DELETE' });
      setSections([]);
      setDisplaySections([]);
    } catch {
      // silently ignore
    }
  };

  // PostHog not connected state
  if (hasPostHog === false) {
    return (
      <div className="max-w-[1200px] mx-auto">
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

  const tabClass = (active: boolean) =>
    `px-4 py-2 text-[13px] font-medium border-b-2 transition-colors ${
      active
        ? 'border-accent text-accent'
        : 'border-transparent text-text-dim hover:text-text-body'
    }`;

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Tab navigation */}
      <div className="flex items-center border-b border-border-dim mb-5">
        <Link href="/events" className={tabClass(true)}>Events</Link>
        <Link href="/events/data" className={tabClass(false)}>Raw Data</Link>
      </div>

      {/* Top bar: Add Event Tracker + Sync + DateRange */}
      <div className="flex items-center justify-between gap-2 mb-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditingTracker(null); setTrackerModalOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-text-dim hover:text-text-body border border-border-dim rounded-lg hover:border-accent/50 transition-colors"
          >
            <Plus size={13} />
            Add Event Tracker
          </button>
          {(sections.length > 0 || displaySections.length > 0) && (
            <button
              onClick={handleDeleteAll}
              className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-error/70 hover:text-error border border-border-dim rounded-lg hover:border-error/50 transition-colors"
            >
              <Trash2 size={13} />
              Delete All
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing || sections.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-text-dim hover:text-text-body border border-border-dim rounded-lg hover:border-accent/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Display sections */}
      {loading ? (
        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-bg-surface rounded-xl border border-border-dim p-5">
              <div className="h-4 bg-bg-elevated animate-pulse rounded-lg w-48 mb-4" />
              <div className="space-y-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex justify-between py-2">
                    <div className="h-3.5 bg-bg-elevated animate-pulse rounded w-32" />
                    <div className="h-3.5 bg-bg-elevated animate-pulse rounded w-12" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : displaySections.length === 0 && sections.length === 0 ? (
        <div className="bg-bg-surface rounded-xl border border-border-dim p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center">
            <BarChart3 size={22} className="text-text-dim" />
          </div>
          <p className="text-text-dim text-[13px]">No event trackers yet</p>
          <p className="text-text-dim/60 text-[11px] max-w-xs text-center">
            Add an event tracker to start fetching data from PostHog, then create display sections to visualize it.
          </p>
          <button
            onClick={() => { setEditingTracker(null); setTrackerModalOpen(true); }}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-accent-text px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
          >
            <Plus size={15} />
            Add Event Tracker
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Existing tracker info (compact) */}
          {sections.length > 0 && displaySections.length === 0 && (
            <div className="bg-bg-surface rounded-xl border border-border-dim p-6 flex flex-col items-center justify-center gap-2">
              <p className="text-text-dim text-[13px]">
                {sections.length} event tracker{sections.length !== 1 ? 's' : ''} active. Create a section to visualize the data.
              </p>
            </div>
          )}

          {displaySections.map(ds => {
            if (ds.section_type === 'kpi_bar') {
              return (
                <KPIBarSection
                  key={`${ds.id}-${refreshKey}`}
                  section={ds}
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                  onEdit={() => { setEditingDisplay(ds); setDisplayModalOpen(true); }}
                  onDelete={() => handleDeleteDisplay(ds.id)}
                  onDuplicate={(type?: string) => handleDuplicate(ds.id, type)}
                  onAddMarker={() => { setEditingDisplay(ds); setDisplayModalOpen(true); }}
                  onSectionUpdated={() => { fetchDisplaySections(); setRefreshKey(k => k + 1); }}
                />
              );
            }
            const SectionComponent = ds.section_type === 'bar' ? BarChartSection : TableSection;
            return (
              <SectionComponent
                key={`${ds.id}-${refreshKey}`}
                section={ds}
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onEdit={() => { setEditingDisplay(ds); setDisplayModalOpen(true); }}
                onDelete={() => handleDeleteDisplay(ds.id)}
                onDuplicate={(type?: string) => handleDuplicate(ds.id, type)}
              />
            );
          })}

          {/* Add Section button */}
          {sections.length > 0 && (
            <button
              onClick={() => { setEditingDisplay(null); setDisplayModalOpen(true); }}
              className="w-full flex items-center justify-center gap-1.5 border border-dashed border-border-dim rounded-xl py-4 text-[13px] font-medium text-text-dim hover:border-accent/50 hover:text-accent transition-colors"
            >
              <Plus size={15} />
              Add Section
            </button>
          )}
        </div>
      )}

      {/* Event Tracker Modal */}
      {trackerModalOpen && (
        <AddEventSectionModal
          section={editingTracker}
          onClose={() => { setTrackerModalOpen(false); setEditingTracker(null); }}
          onSaved={() => { setTrackerModalOpen(false); setEditingTracker(null); fetchSections(); }}
        />
      )}

      {/* Display Section Modal */}
      {displayModalOpen && (
        <AddDisplaySectionModal
          section={editingDisplay}
          onClose={() => { setDisplayModalOpen(false); setEditingDisplay(null); }}
          onSaved={() => { setDisplayModalOpen(false); setEditingDisplay(null); fetchDisplaySections(); }}
        />
      )}
    </div>
  );
}
