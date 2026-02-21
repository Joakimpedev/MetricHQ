'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ChevronRight, ChevronDown, Database, Lock } from 'lucide-react';
import { useSubscription } from '../../../../components/SubscriptionProvider';
import { apiFetch } from '@/lib/api';


interface PropertyValue {
  value: string;
  count: number;
}

interface EventData {
  event_name: string;
  properties: Record<string, PropertyValue[]>;
}

export default function RawDataPage() {
  const { user } = useUser();
  const { subscription, loading: subLoading } = useSubscription();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fetchRawData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ userId: user.id });
      const res = await apiFetch(`/api/custom-events/raw-data?${params}`);
      const json = await res.json();
      if (res.ok) setEvents(json.events || []);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchRawData(); }, [fetchRawData]);

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const tabClass = (active: boolean) =>
    `px-4 py-2 text-[13px] font-medium border-b-2 transition-colors ${
      active
        ? 'border-accent text-accent'
        : 'border-transparent text-text-dim hover:text-text-body'
    }`;

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

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Tab navigation */}
      <div className="flex items-center border-b border-border-dim mb-5">
        <Link href="/events" className={tabClass(false)}>Events</Link>
        <Link href="/events/data" className={tabClass(true)}>Raw Data</Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-bg-surface rounded-xl border border-border-dim p-4">
              <div className="h-4 bg-bg-elevated animate-pulse rounded w-40" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="bg-bg-surface rounded-xl border border-border-dim p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center">
            <Database size={22} className="text-text-dim" />
          </div>
          <p className="text-text-dim text-[13px]">No synced data yet</p>
          <p className="text-text-dim/60 text-[11px]">Add event trackers on the Events tab, then click Sync to fetch data</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map(event => {
            const eventKey = event.event_name;
            const isExpanded = expanded[eventKey];
            const properties = Object.entries(event.properties);

            return (
              <div key={eventKey} className="bg-bg-surface rounded-xl border border-border-dim overflow-hidden">
                {/* Event row */}
                <button
                  onClick={() => toggleExpand(eventKey)}
                  className="w-full flex items-center gap-2 px-5 py-3 text-left hover:bg-bg-hover transition-colors"
                >
                  {isExpanded ? <ChevronDown size={14} className="text-text-dim" /> : <ChevronRight size={14} className="text-text-dim" />}
                  <span className="text-[13px] font-medium text-text-heading">{event.event_name}</span>
                  <span className="text-[11px] text-text-dim ml-auto">
                    {properties.length} propert{properties.length !== 1 ? 'ies' : 'y'}
                  </span>
                </button>

                {/* Expanded: properties + values */}
                {isExpanded && (
                  <div className="border-t border-border-dim/50">
                    {properties.map(([propName, values]) => {
                      const propKey = `${eventKey}::${propName}`;
                      const isPropExpanded = expanded[propKey];

                      return (
                        <div key={propKey}>
                          <button
                            onClick={() => toggleExpand(propKey)}
                            className="w-full flex items-center gap-2 pl-10 pr-5 py-2.5 text-left hover:bg-bg-hover transition-colors border-b border-border-dim/30"
                          >
                            {isPropExpanded ? <ChevronDown size={12} className="text-text-dim" /> : <ChevronRight size={12} className="text-text-dim" />}
                            <span className="text-[12px] text-text-body">
                              {propName === '_none' ? '(no grouping)' : propName}
                            </span>
                            <span className="text-[11px] text-text-dim ml-auto">
                              {values.length} value{values.length !== 1 ? 's' : ''}
                            </span>
                          </button>

                          {isPropExpanded && (
                            <div className="pl-16 pr-5 py-1 bg-bg-body/50">
                              {values.length === 0 ? (
                                <p className="text-[11px] text-text-dim py-2">No values cached yet. Sync on the Events page to fetch data.</p>
                              ) : values.map((v, i) => (
                                <div key={i} className="flex justify-between py-1.5 border-b border-border-dim/20 last:border-0">
                                  <span className="text-[12px] text-text-body">{v.value === '_total' ? '(total)' : v.value}</span>
                                  <span className="text-[12px] text-text-heading font-medium tabular-nums">{v.count.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
