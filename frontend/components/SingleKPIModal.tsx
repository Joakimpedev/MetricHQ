'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { X, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface KPIMarker {
  label: string;
  item_type: 'count' | 'rate' | 'cost_per';
  event_name: string;
  property_name: string;
  property_value: string;
  rate_event_name: string;
  rate_property_name: string;
  rate_property_value: string;
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

interface EventTrackerSection {
  id: number;
  event_name: string;
  group_by_property: string | null;
}

interface Props {
  section: DisplaySection;
  markerIndex: number | null; // null = adding new
  onClose: () => void;
  onSaved: () => void;
}

const emptyMarker = (): KPIMarker => ({
  label: '',
  item_type: 'count',
  event_name: '',
  property_name: '',
  property_value: '',
  rate_event_name: '',
  rate_property_name: '',
  rate_property_value: '',
});

export default function SingleKPIModal({ section, markerIndex, onClose, onSaved }: Props) {
  const { user } = useUser();
  const isEdit = markerIndex !== null;

  const [marker, setMarker] = useState<KPIMarker>(() => {
    if (isEdit && section.items[markerIndex]) {
      const item = section.items[markerIndex];
      return {
        label: item.label || '',
        item_type: (item.item_type as 'count' | 'rate' | 'cost_per') || 'count',
        event_name: item.event_name || '',
        property_name: item.property_name || '',
        property_value: item.property_value || '',
        rate_event_name: item.rate_event_name || '',
        rate_property_name: item.rate_property_name || '',
        rate_property_value: item.rate_property_value || '',
      };
    }
    return emptyMarker();
  });

  const [costPerSource, setCostPerSource] = useState<'ad_spend' | 'revenue'>(() => {
    if (isEdit && section.items[markerIndex]?.item_type === 'cost_per' && section.items[markerIndex]?.rate_event_name === 'revenue') {
      return 'revenue';
    }
    return 'ad_spend';
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [trackerSections, setTrackerSections] = useState<EventTrackerSection[]>([]);
  const [loadingTrackers, setLoadingTrackers] = useState(false);
  const [valuesCache, setValuesCache] = useState<Record<string, string[]>>({});
  const [loadingValues, setLoadingValues] = useState<Record<string, boolean>>({});
  const valuesCacheRef = React.useRef<Record<string, string[]>>({});
  const fetchingRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;
    setLoadingTrackers(true);
    fetch(`${API_URL}/api/custom-events/sections?userId=${encodeURIComponent(user.id)}`)
      .then(r => r.json())
      .then(j => setTrackerSections(j.sections || []))
      .catch(() => {})
      .finally(() => setLoadingTrackers(false));
  }, [user?.id]);

  const eventNames = [...new Set(trackerSections.map(s => s.event_name))];

  const getPropertiesForEvent = (eventName: string): string[] => {
    return [...new Set(
      trackerSections
        .filter(s => s.event_name === eventName && s.group_by_property)
        .map(s => s.group_by_property!)
    )];
  };

  const fetchValues = useCallback(async (eventName: string, propertyName: string) => {
    const cacheKey = `${eventName}::${propertyName}`;
    if (!user?.id || !eventName || !propertyName) return;
    if (fetchingRef.current.has(cacheKey)) return;
    if (valuesCacheRef.current[cacheKey]?.length > 0) return;

    fetchingRef.current.add(cacheKey);
    setLoadingValues(prev => ({ ...prev, [cacheKey]: true }));
    try {
      const params = new URLSearchParams({ userId: user.id, eventName, propertyName });
      const res = await fetch(`${API_URL}/api/custom-events/values?${params}`);
      const json = await res.json();
      const values = json.values || [];
      valuesCacheRef.current[cacheKey] = values;
      setValuesCache(prev => ({ ...prev, [cacheKey]: values }));
    } catch {
      // don't cache failures
    } finally {
      fetchingRef.current.delete(cacheKey);
      setLoadingValues(prev => ({ ...prev, [cacheKey]: false }));
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (marker.event_name && marker.property_name) {
      fetchValues(marker.event_name, marker.property_name);
    }
    if (marker.rate_event_name && marker.rate_property_name) {
      fetchValues(marker.rate_event_name, marker.rate_property_name);
    }
  }, [user?.id, marker.event_name, marker.property_name, marker.rate_event_name, marker.rate_property_name, fetchValues]);

  const updateMarker = (updates: Partial<KPIMarker>) => {
    setMarker(prev => {
      const next = { ...prev, ...updates };
      if ('event_name' in updates) {
        next.property_name = '';
        next.property_value = '';
      }
      if ('property_name' in updates) {
        next.property_value = '';
      }
      if ('rate_event_name' in updates) {
        next.rate_property_name = '';
        next.rate_property_value = '';
      }
      if ('rate_property_name' in updates) {
        next.rate_property_value = '';
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!marker.event_name) {
      setError('Select an event');
      return;
    }

    setSaving(true);
    setError('');

    const markerPayload = {
      event_name: marker.event_name,
      property_name: marker.property_name || null,
      property_value: marker.property_value || null,
      item_type: marker.item_type,
      label: marker.label || null,
      rate_event_name: marker.item_type === 'rate' ? (marker.rate_event_name || null)
        : marker.item_type === 'cost_per' ? (costPerSource === 'revenue' ? 'revenue' : null) : null,
      rate_property_name: marker.item_type === 'rate' ? (marker.rate_property_name || null) : null,
      rate_property_value: marker.item_type === 'rate' ? (marker.rate_property_value || null) : null,
    };

    // Build updated items array
    const existingItems = section.items.map(i => ({
      event_name: i.event_name,
      property_name: i.property_name || null,
      property_value: i.property_value || null,
      item_type: i.item_type || 'count',
      label: i.label || null,
      rate_event_name: i.rate_event_name || null,
      rate_property_name: i.rate_property_name || null,
      rate_property_value: i.rate_property_value || null,
    }));

    if (isEdit) {
      existingItems[markerIndex] = markerPayload;
    } else {
      existingItems.push(markerPayload);
    }

    try {
      const res = await fetch(`${API_URL}/api/event-display/sections/${section.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: section.title,
          items: existingItems,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to save');
        return;
      }
      onSaved();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 text-[13px] bg-bg-body border border-border-dim rounded-lg text-text-body placeholder:text-text-dim/50 focus:outline-none focus:border-accent';
  const selectClass = 'w-full px-3 py-2 text-[13px] bg-bg-body border border-border-dim rounded-lg text-text-body focus:outline-none focus:border-accent';

  const renderEventSelector = (
    eventName: string,
    propertyName: string,
    propertyValue: string,
    onChange: (field: string, value: string) => void,
  ) => {
    const properties = eventName ? getPropertiesForEvent(eventName) : [];
    const valKey = `${eventName}::${propertyName}`;
    const values = valuesCache[valKey] || [];
    const isLoadingVals = loadingValues[valKey];

    return (
      <div className="space-y-2">
        <select
          value={eventName}
          onChange={e => onChange('event_name', e.target.value)}
          className={selectClass}
        >
          <option value="">Select event...</option>
          {eventNames.map(e => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        {eventName && properties.length > 0 && (
          <select
            value={propertyName}
            onChange={e => onChange('property_name', e.target.value)}
            className={selectClass}
          >
            <option value="">Property (optional)...</option>
            {properties.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}
        {propertyName && (
          <select
            value={propertyValue}
            onChange={e => onChange('property_value', e.target.value)}
            className={selectClass}
            disabled={isLoadingVals}
          >
            <option value="">{isLoadingVals ? 'Loading...' : 'Value (optional)...'}</option>
            {values.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-bg-overlay" onClick={onClose} />
      <div className="relative bg-bg-surface border border-border-dim rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-dim">
          <h2 className="text-[15px] font-semibold text-text-heading">
            {isEdit ? 'Edit KPI' : 'Add KPI'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-bg-hover text-text-dim">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-text-dim mb-1.5 block">Title</label>
            <input
              type="text"
              value={marker.label}
              onChange={e => setMarker(prev => ({ ...prev, label: e.target.value }))}
              placeholder="e.g. Signups"
              className={inputClass}
            />
          </div>

          {/* Type toggle */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-text-dim mb-1.5 block">Type</label>
            <div className="flex gap-1 p-0.5 bg-bg-body rounded-lg border border-border-dim">
              <button
                onClick={() => updateMarker({ item_type: 'count' })}
                className={`flex-1 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                  marker.item_type === 'count'
                    ? 'bg-bg-surface text-text-heading shadow-sm'
                    : 'text-text-dim hover:text-text-body'
                }`}
              >
                Count
              </button>
              <button
                onClick={() => updateMarker({ item_type: 'rate' })}
                className={`flex-1 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                  marker.item_type === 'rate'
                    ? 'bg-bg-surface text-text-heading shadow-sm'
                    : 'text-text-dim hover:text-text-body'
                }`}
              >
                Rate
              </button>
              <button
                onClick={() => updateMarker({ item_type: 'cost_per' })}
                className={`flex-1 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                  marker.item_type === 'cost_per'
                    ? 'bg-bg-surface text-text-heading shadow-sm'
                    : 'text-text-dim hover:text-text-body'
                }`}
              >
                Per Event
              </button>
            </div>
          </div>

          {/* Event selectors */}
          {loadingTrackers ? (
            <div className="flex items-center gap-2 py-3 text-[13px] text-text-dim">
              <Loader2 size={14} className="animate-spin" /> Loading event trackers...
            </div>
          ) : marker.item_type === 'rate' ? (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-text-dim mb-1.5 block">
                  Total pool (e.g. page views)
                </label>
                {renderEventSelector(
                  marker.event_name,
                  marker.property_name,
                  marker.property_value,
                  (field, value) => updateMarker({ [field]: value } as Partial<KPIMarker>),
                )}
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-text-dim mb-1.5 block">
                  Target action (e.g. signups)
                </label>
                {renderEventSelector(
                  marker.rate_event_name,
                  marker.rate_property_name,
                  marker.rate_property_value,
                  (field, value) => {
                    const rateField = `rate_${field}` as keyof KPIMarker;
                    updateMarker({ [rateField]: value } as Partial<KPIMarker>);
                  },
                )}
              </div>
            </div>
          ) : marker.item_type === 'cost_per' ? (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-text-dim mb-1.5 block">Source</label>
                <div className="flex gap-1 p-0.5 bg-bg-body rounded-lg border border-border-dim">
                  <button
                    onClick={() => setCostPerSource('ad_spend')}
                    className={`flex-1 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                      costPerSource === 'ad_spend'
                        ? 'bg-bg-surface text-text-heading shadow-sm'
                        : 'text-text-dim hover:text-text-body'
                    }`}
                  >
                    Ad Spend
                  </button>
                  <button
                    onClick={() => setCostPerSource('revenue')}
                    className={`flex-1 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                      costPerSource === 'revenue'
                        ? 'bg-bg-surface text-text-heading shadow-sm'
                        : 'text-text-dim hover:text-text-body'
                    }`}
                  >
                    Revenue
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-text-dim mb-1.5 block">
                  {costPerSource === 'revenue' ? 'Revenue divided by this event' : 'Ad spend divided by this event'}
                </label>
                {renderEventSelector(
                  marker.event_name,
                  marker.property_name,
                  marker.property_value,
                  (field, value) => updateMarker({ [field]: value } as Partial<KPIMarker>),
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-text-dim mb-1.5 block">Event</label>
              {renderEventSelector(
                marker.event_name,
                marker.property_name,
                marker.property_value,
                (field, value) => updateMarker({ [field]: value } as Partial<KPIMarker>),
              )}
            </div>
          )}

          {error && <p className="text-error text-[12px]">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-dim">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] text-text-dim hover:text-text-body transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-accent-text rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEdit ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
