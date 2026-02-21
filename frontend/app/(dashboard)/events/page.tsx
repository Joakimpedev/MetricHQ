'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { Plus, Plug, RefreshCw, BarChart3, Trash2, Lock, Info, X } from 'lucide-react';
import { useSubscription } from '../../../components/SubscriptionProvider';
import DateRangeSelector, { type DateRange } from '../../../components/DateRangeSelector';
import AddEventSectionModal from '../../../components/AddEventSectionModal';
import AddDisplaySectionModal from '../../../components/AddDisplaySectionModal';
import TableSection from '../../../components/TableSection';
import BarChartSection from '../../../components/BarChartSection';
import KPIBarSection from '../../../components/KPIBarSection';
import { apiFetch } from '@/lib/api';


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

function defaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

export default function EventsPage() {
  const { user } = useUser();
  const { subscription, loading: subLoading } = useSubscription();
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
  const [infoDismissed, setInfoDismissed] = useState(() => {
    try { return localStorage.getItem('metrichq-events-info-dismissed') === '1'; } catch { return false; }
  });

  const handleSync = async () => {
    if (!user?.id || syncing) return;
    setSyncing(true);
    try {
      await apiFetch(`/api/custom-events/sync`, {
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
      const res = await apiFetch(`/api/custom-events/sections?${params}`);
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
      const res = await apiFetch(`/api/event-display/sections?${params}`);
      const json = await res.json();
      if (res.ok) setDisplaySections(json.sections || []);
    } catch {
      // silently ignore
    }
  }, [user?.id]);

  // Check if PostHog is connected
  useEffect(() => {
    if (!user?.id) return;
    apiFetch(`/api/connections?userId=${encodeURIComponent(user.id)}`)
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
      await apiFetch(`/api/custom-events/sections/${id}?userId=${encodeURIComponent(user.id)}`, { method: 'DELETE' });
      fetchSections();
    } catch {
      // silently ignore
    }
  };

  const handleDeleteDisplay = async (id: number) => {
    if (!user?.id) return;
    try {
      await apiFetch(`/api/event-display/sections/${id}?userId=${encodeURIComponent(user.id)}`, { method: 'DELETE' });
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
      await apiFetch(`/api/event-display/sections/${id}/duplicate`, {
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
      await apiFetch(`/api/custom-events/all?userId=${encodeURIComponent(user.id)}`, { method: 'DELETE' });
      setSections([]);
      setDisplaySections([]);
    } catch {
      // silently ignore
    }
  };

  if (!subLoading && subscription && !subscription.limits?.extraPages) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center mx-auto mb-4">
            <Lock size={22} className="text-text-dim" />
          </div>
          <h2 className="text-[16px] font-semibold text-text-heading mb-2">Available on Growth and Pro</h2>
          <p className="text-[13px] text-text-dim mb-6">Event tracking is available on the Growth and Pro plans.</p>
          <Link
            href="/pricing"
            className="inline-block bg-accent hover:bg-accent-hover text-accent-text px-6 py-2.5 rounded-lg text-[13px] font-medium transition-colors"
          >
            View plans
          </Link>
        </div>
      </div>
    );
  }

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
        <div className="bg-bg-surface rounded-xl border border-border-dim p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center mx-auto mb-3">
              <BarChart3 size={22} className="text-text-dim" />
            </div>
            <h3 className="text-[15px] font-semibold text-text-heading mb-1">Track and visualize PostHog events</h3>
            <p className="text-text-dim text-[12px] max-w-sm mx-auto">
              Events works in two steps: first pull data from PostHog, then choose how to display it.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
            <div className="flex-1 border border-border-dim rounded-lg p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-[13px] font-bold text-accent">1</span>
              </div>
              <p className="text-[13px] font-medium text-text-heading mb-1">Add an Event Tracker</p>
              <p className="text-[11px] text-text-dim">Pulls data from PostHog for a specific event (e.g. signups, page views)</p>
            </div>
            <div className="flex-1 border border-border-dim rounded-lg p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-[13px] font-bold text-accent">2</span>
              </div>
              <p className="text-[13px] font-medium text-text-heading mb-1">Add a Display Section</p>
              <p className="text-[11px] text-text-dim">Create a table, chart, or KPI bar to visualize the tracked data</p>
            </div>
          </div>
          <div className="text-center mt-6">
            <button
              onClick={() => { setEditingTracker(null); setTrackerModalOpen(true); }}
              className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-accent-text px-5 py-2.5 rounded-lg text-[13px] font-medium transition-colors"
            >
              <Plus size={15} />
              Add Event Tracker
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Info banner — dismissible */}
          {!infoDismissed && displaySections.length === 0 && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-accent/5 border border-accent/15">
              <Info size={16} className="text-accent mt-0.5 shrink-0" />
              <div className="flex-1 text-[12px] text-text-body">
                <span className="font-medium text-text-heading">How it works:</span>{' '}
                Add an event tracker to pull data from PostHog, then create a display section (table, chart, or KPI) to visualize it.
              </div>
              <button
                onClick={() => { setInfoDismissed(true); try { localStorage.setItem('metrichq-events-info-dismissed', '1'); } catch {} }}
                className="p-0.5 rounded hover:bg-bg-hover text-text-dim shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Existing tracker info — when trackers exist but no display sections */}
          {sections.length > 0 && displaySections.length === 0 && (
            <div className="bg-bg-surface rounded-xl border border-border-dim p-6 flex flex-col items-center justify-center gap-3">
              <p className="text-text-body text-[13px] font-medium">
                {sections.length} event tracker{sections.length !== 1 ? 's' : ''} active
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {sections.map(s => (
                  <span key={s.id} className="text-[11px] bg-bg-elevated text-text-dim px-2 py-0.5 rounded-full">
                    {s.title || s.event_name}
                  </span>
                ))}
              </div>
              <p className="text-text-dim text-[12px] max-w-xs text-center">
                Your data is being tracked. Add a section below to see it as a table, chart, or KPI.
              </p>
              <button
                onClick={() => { setEditingDisplay(null); setDisplayModalOpen(true); }}
                className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-accent-text px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
              >
                <Plus size={15} />
                Add Section
              </button>
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
          onSaved={() => { setDisplayModalOpen(false); setEditingDisplay(null); fetchDisplaySections(); setRefreshKey(k => k + 1); }}
        />
      )}
    </div>
  );
}
