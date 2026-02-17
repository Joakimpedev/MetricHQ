'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { X, Loader2, Minus, Plus, Table, BarChart3, LineChart, PieChart, Activity, Trash2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface DisplayItem {
  event_name: string;
  property_name: string;
  property_value: string;
}

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

interface Props {
  section: DisplaySection | null;
  onClose: () => void;
  onSaved: () => void;
}

interface EventTrackerSection {
  id: number;
  event_name: string;
  group_by_property: string | null;
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

export default function AddDisplaySectionModal({ section, onClose, onSaved }: Props) {
  const { user } = useUser();
  const isEdit = !!section;

  const [step, setStep] = useState<'type' | 'config'>(isEdit ? 'config' : 'type');
  const [sectionType, setSectionType] = useState(section?.section_type || 'table');
  const [title, setTitle] = useState(section?.title || '');
  const [items, setItems] = useState<DisplayItem[]>(
    section?.items?.length && section?.section_type !== 'kpi_bar' ? section.items.map(i => ({
      event_name: i.event_name,
      property_name: i.property_name || '',
      property_value: i.property_value || '',
    })) : [{ event_name: '', property_name: '', property_value: '' }]
  );

  // KPI bar markers
  const [kpiMarkers, setKpiMarkers] = useState<KPIMarker[]>(() => {
    if (section?.section_type === 'kpi_bar' && section.items?.length) {
      return section.items.map(i => ({
        label: i.label || '',
        item_type: (i.item_type as 'count' | 'rate') || 'count',
        event_name: i.event_name || '',
        property_name: i.property_name || '',
        property_value: i.property_value || '',
        rate_event_name: i.rate_event_name || '',
        rate_property_name: i.rate_property_name || '',
        rate_property_value: i.rate_property_value || '',
      }));
    }
    return [emptyMarker()];
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Available event tracker sections (for cascading dropdowns)
  const [trackerSections, setTrackerSections] = useState<EventTrackerSection[]>([]);
  const [loadingTrackers, setLoadingTrackers] = useState(false);
  // Cache of property values per event+property combo
  const [valuesCache, setValuesCache] = useState<Record<string, string[]>>({});
  const [loadingValues, setLoadingValues] = useState<Record<string, boolean>>({});

  // Fetch event tracker sections
  useEffect(() => {
    if (!user?.id) return;
    setLoadingTrackers(true);
    fetch(`${API_URL}/api/custom-events/sections?userId=${encodeURIComponent(user.id)}`)
      .then(r => r.json())
      .then(j => setTrackerSections(j.sections || []))
      .catch(() => {})
      .finally(() => setLoadingTrackers(false));
  }, [user?.id]);

  // Distinct event names from trackers
  const eventNames = [...new Set(trackerSections.map(s => s.event_name))];

  // Properties for a given event name (from tracker sections with non-null group_by_property)
  const getPropertiesForEvent = (eventName: string): string[] => {
    return [...new Set(
      trackerSections
        .filter(s => s.event_name === eventName && s.group_by_property)
        .map(s => s.group_by_property!)
    )];
  };

  // Track in-flight fetches to avoid duplicates (ref to avoid stale closures)
  const fetchingRef = React.useRef<Set<string>>(new Set());

  // Fetch property values - no stale closure deps
  const fetchValues = useCallback(async (eventName: string, propertyName: string) => {
    const cacheKey = `${eventName}::${propertyName}`;
    if (fetchingRef.current.has(cacheKey)) return;
    if (!user?.id || !eventName || !propertyName) return;

    // Check cache via functional update to avoid stale closure
    let alreadyCached = false;
    setValuesCache(prev => {
      if (prev[cacheKey] && prev[cacheKey].length > 0) alreadyCached = true;
      return prev;
    });
    if (alreadyCached) return;

    fetchingRef.current.add(cacheKey);
    setLoadingValues(prev => ({ ...prev, [cacheKey]: true }));
    try {
      const params = new URLSearchParams({ userId: user.id, eventName, propertyName });
      const res = await fetch(`${API_URL}/api/custom-events/values?${params}`);
      const json = await res.json();
      setValuesCache(prev => ({ ...prev, [cacheKey]: json.values || [] }));
    } catch {
      // don't cache failures so user can retry
    } finally {
      fetchingRef.current.delete(cacheKey);
      setLoadingValues(prev => ({ ...prev, [cacheKey]: false }));
    }
  }, [user?.id]);

  // Pre-fetch values for existing items when editing
  useEffect(() => {
    if (!user?.id || !isEdit || !section?.items?.length) return;
    for (const item of section.items) {
      if (item.event_name && item.property_name) {
        fetchValues(item.event_name, item.property_name);
      }
      if (item.rate_event_name && item.rate_property_name) {
        fetchValues(item.rate_event_name, item.rate_property_name);
      }
    }
  }, [user?.id, isEdit, fetchValues]); // eslint-disable-line react-hooks/exhaustive-deps

  const addRow = () => {
    const lastItem = items[items.length - 1];
    setItems(prev => [...prev, {
      event_name: lastItem?.event_name || '',
      property_name: lastItem?.property_name || '',
      property_value: lastItem?.property_value || '',
    }]);
  };

  const updateItem = (index: number, field: keyof DisplayItem, value: string) => {
    let eventNameForFetch = '';
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'event_name') {
        next[index].property_name = '';
        next[index].property_value = '';
      }
      if (field === 'property_name') {
        next[index].property_value = '';
        eventNameForFetch = next[index].event_name;
      }
      return next;
    });
    if (field === 'property_name' && value) {
      // Fetch outside state updater to avoid stale closure
      setTimeout(() => {
        if (eventNameForFetch) fetchValues(eventNameForFetch, value);
      }, 0);
    }
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // KPI marker helpers
  const addKpiMarker = () => {
    if (kpiMarkers.length >= 4) return;
    setKpiMarkers(prev => [...prev, emptyMarker()]);
  };

  const updateKpiMarker = (index: number, updates: Partial<KPIMarker>) => {
    let fetchEv = '';
    let fetchProp = '';
    setKpiMarkers(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      if ('event_name' in updates) {
        next[index].property_name = '';
        next[index].property_value = '';
      }
      if ('property_name' in updates && updates.property_name && next[index].event_name) {
        next[index].property_value = '';
        fetchEv = next[index].event_name;
        fetchProp = updates.property_name;
      }
      if ('rate_event_name' in updates) {
        next[index].rate_property_name = '';
        next[index].rate_property_value = '';
      }
      if ('rate_property_name' in updates && updates.rate_property_name && next[index].rate_event_name) {
        next[index].rate_property_value = '';
        fetchEv = next[index].rate_event_name;
        fetchProp = updates.rate_property_name;
      }
      return next;
    });
    if (fetchEv && fetchProp) {
      setTimeout(() => fetchValues(fetchEv, fetchProp), 0);
    }
  };

  const removeKpiMarker = (index: number) => {
    if (kpiMarkers.length <= 1) return;
    setKpiMarkers(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);
    setError('');

    let bodyItems: Record<string, string | null>[];

    if (sectionType === 'kpi_bar') {
      const validMarkers = kpiMarkers.filter(m => m.event_name);
      if (validMarkers.length === 0) {
        setError('Add at least one KPI marker with an event');
        setSaving(false);
        return;
      }
      bodyItems = validMarkers.map(m => ({
        event_name: m.event_name,
        property_name: m.property_name || null,
        property_value: m.property_value || null,
        item_type: m.item_type,
        label: m.label || null,
        rate_event_name: m.item_type === 'rate' ? (m.rate_event_name || null) : null,
        rate_property_name: m.item_type === 'rate' ? (m.rate_property_name || null) : null,
        rate_property_value: m.item_type === 'rate' ? (m.rate_property_value || null) : null,
      }));
    } else {
      const validItems = items.filter(i => i.event_name);
      if (validItems.length === 0) {
        setError('Add at least one row');
        setSaving(false);
        return;
      }
      bodyItems = validItems.map(i => ({
        event_name: i.event_name,
        property_name: i.property_name || null,
        property_value: i.property_value || null,
        item_type: 'standard',
        label: null,
        rate_event_name: null,
        rate_property_name: null,
        rate_property_value: null,
      }));
    }

    const body = {
      userId: user.id,
      title: title.trim() || (sectionType === 'kpi_bar' ? 'KPI Bar' : 'Untitled'),
      section_type: sectionType,
      items: bodyItems,
    };

    try {
      const url = isEdit
        ? `${API_URL}/api/event-display/sections/${section.id}`
        : `${API_URL}/api/event-display/sections`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
  const labelClass = 'text-[11px] font-medium uppercase tracking-wider text-text-dim mb-1.5';
  const selectClass = 'w-full px-3 py-2 text-[13px] bg-bg-body border border-border-dim rounded-lg text-text-body focus:outline-none focus:border-accent';

  const configTitle = sectionType === 'kpi_bar' ? 'KPI Bar' : sectionType === 'bar' ? 'Bar Chart' : 'Table';

  // Shared event selector row (used by both table/bar config and KPI config)
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
      <div className="flex gap-2 flex-1">
        <select
          value={eventName}
          onChange={e => onChange('event_name', e.target.value)}
          className={selectClass}
        >
          <option value="">Event...</option>
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
            <option value="">Property...</option>
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
            <option value="">{isLoadingVals ? 'Loading...' : 'Value...'}</option>
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
      <div className="relative bg-bg-surface border border-border-dim rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-dim shrink-0">
          <h2 className="text-[15px] font-semibold text-text-heading">
            {isEdit ? 'Edit Section' : step === 'type' ? 'Add Section' : `Configure ${configTitle}`}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-bg-hover text-text-dim">
            <X size={16} />
          </button>
        </div>

        {step === 'type' ? (
          /* Step 1: Type picker */
          <div className="px-5 py-5 space-y-3">
            <button
              onClick={() => { setSectionType('table'); setStep('config'); }}
              className="w-full flex items-center gap-3 p-4 rounded-lg border border-border-dim hover:border-accent/50 hover:bg-bg-hover transition-colors text-left"
            >
              <Table size={20} className="text-accent shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-text-heading">Table</p>
                <p className="text-[11px] text-text-dim">Show counts for specific event/property combinations</p>
              </div>
            </button>
            <button
              onClick={() => { setSectionType('bar'); setStep('config'); }}
              className="w-full flex items-center gap-3 p-4 rounded-lg border border-border-dim hover:border-accent/50 hover:bg-bg-hover transition-colors text-left"
            >
              <BarChart3 size={20} className="text-accent shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-text-heading">Bar Chart</p>
                <p className="text-[11px] text-text-dim">Horizontal bar chart comparing event counts</p>
              </div>
            </button>
            <button
              onClick={() => { setSectionType('kpi_bar'); setStep('config'); }}
              className="w-full flex items-center gap-3 p-4 rounded-lg border border-border-dim hover:border-accent/50 hover:bg-bg-hover transition-colors text-left"
            >
              <Activity size={20} className="text-accent shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-text-heading">KPI Bar</p>
                <p className="text-[11px] text-text-dim">Up to 4 key metrics — counts or conversion rates</p>
              </div>
            </button>
            <div className="w-full flex items-center gap-3 p-4 rounded-lg border border-border-dim opacity-40 cursor-not-allowed">
              <LineChart size={20} className="text-text-dim shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-text-dim">Line Chart</p>
                <p className="text-[11px] text-text-dim">Coming soon</p>
              </div>
            </div>
            <div className="w-full flex items-center gap-3 p-4 rounded-lg border border-border-dim opacity-40 cursor-not-allowed">
              <PieChart size={20} className="text-text-dim shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-text-dim">Donut Chart</p>
                <p className="text-[11px] text-text-dim">Coming soon</p>
              </div>
            </div>
          </div>
        ) : sectionType === 'kpi_bar' ? (
          /* KPI Bar config */
          <>
            <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
              {/* KPI Markers */}
              <div>
                <label className={labelClass}>KPI Markers</label>
                {loadingTrackers ? (
                  <div className="flex items-center gap-2 py-3 text-[13px] text-text-dim">
                    <Loader2 size={14} className="animate-spin" /> Loading event trackers...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {kpiMarkers.map((marker, index) => (
                      <div key={index} className="border border-border-dim rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-medium text-text-dim">Marker {index + 1}</span>
                          {kpiMarkers.length > 1 && (
                            <button
                              onClick={() => removeKpiMarker(index)}
                              className="p-1 rounded hover:bg-bg-hover text-text-dim hover:text-error transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>

                        {/* Title input */}
                        <input
                          type="text"
                          value={marker.label}
                          onChange={e => updateKpiMarker(index, { label: e.target.value })}
                          placeholder="Title (e.g. Signups)"
                          className={inputClass}
                        />

                        {/* Type toggle */}
                        <div className="flex gap-1 p-0.5 bg-bg-body rounded-lg border border-border-dim">
                          <button
                            onClick={() => updateKpiMarker(index, { item_type: 'count' })}
                            className={`flex-1 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                              marker.item_type === 'count'
                                ? 'bg-bg-surface text-text-heading shadow-sm'
                                : 'text-text-dim hover:text-text-body'
                            }`}
                          >
                            Count
                          </button>
                          <button
                            onClick={() => updateKpiMarker(index, { item_type: 'rate' })}
                            className={`flex-1 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                              marker.item_type === 'rate'
                                ? 'bg-bg-surface text-text-heading shadow-sm'
                                : 'text-text-dim hover:text-text-body'
                            }`}
                          >
                            Rate
                          </button>
                          <button
                            onClick={() => updateKpiMarker(index, { item_type: 'cost_per' })}
                            className={`flex-1 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                              marker.item_type === 'cost_per'
                                ? 'bg-bg-surface text-text-heading shadow-sm'
                                : 'text-text-dim hover:text-text-body'
                            }`}
                          >
                            Cost Per
                          </button>
                        </div>

                        {/* Event selector */}
                        {marker.item_type === 'cost_per' ? (
                          <div>
                            <p className="text-[11px] text-text-dim mb-1">Ad spend divided by this event</p>
                            {renderEventSelector(
                              marker.event_name,
                              marker.property_name,
                              marker.property_value,
                              (field, value) => updateKpiMarker(index, { [field]: value } as Partial<KPIMarker>),
                            )}
                          </div>
                        ) : marker.item_type === 'count' ? (
                          <div>
                            <p className="text-[11px] text-text-dim mb-1">Event</p>
                            {renderEventSelector(
                              marker.event_name,
                              marker.property_name,
                              marker.property_value,
                              (field, value) => updateKpiMarker(index, { [field]: value } as Partial<KPIMarker>),
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div>
                              <p className="text-[11px] text-text-dim mb-1">Total (e.g. all visitors)</p>
                              {renderEventSelector(
                                marker.event_name,
                                marker.property_name,
                                marker.property_value,
                                (field, value) => updateKpiMarker(index, { [field]: value } as Partial<KPIMarker>),
                              )}
                            </div>
                            <div>
                              <p className="text-[11px] text-text-dim mb-1">Converted (e.g. purchases)</p>
                              {renderEventSelector(
                                marker.rate_event_name,
                                marker.rate_property_name,
                                marker.rate_property_value,
                                (field, value) => {
                                  const rateField = `rate_${field}` as keyof KPIMarker;
                                  updateKpiMarker(index, { [rateField]: value } as Partial<KPIMarker>);
                                },
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {kpiMarkers.length < 4 && (
                      <button
                        type="button"
                        onClick={addKpiMarker}
                        className="flex items-center gap-1 text-[12px] text-text-dim hover:text-accent transition-colors mt-1"
                      >
                        <Plus size={12} />
                        Add marker
                      </button>
                    )}
                  </div>
                )}
              </div>

              {error && <p className="text-error text-[12px]">{error}</p>}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-dim shrink-0">
              {!isEdit && (
                <button
                  onClick={() => setStep('type')}
                  className="px-4 py-2 text-[13px] text-text-dim hover:text-text-body transition-colors mr-auto"
                >
                  Back
                </button>
              )}
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
                {saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}
              </button>
            </div>
          </>
        ) : (
          /* Step 2: Table/Bar config */
          <>
            <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
              {/* Title */}
              <div>
                <label className={labelClass}>Section Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Signups by Country"
                  className={inputClass}
                />
              </div>

              {/* Rows */}
              <div>
                <label className={labelClass}>Rows</label>
                {loadingTrackers ? (
                  <div className="flex items-center gap-2 py-3 text-[13px] text-text-dim">
                    <Loader2 size={14} className="animate-spin" /> Loading event trackers...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item, index) => {
                      const properties = item.event_name ? getPropertiesForEvent(item.event_name) : [];
                      const valKey = `${item.event_name}::${item.property_name}`;
                      const values = valuesCache[valKey] || [];
                      const isLoadingVals = loadingValues[valKey];

                      return (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-[11px] text-text-dim mt-2.5 w-4 shrink-0 text-right">{index + 1}.</span>
                          <div className="flex-1 flex gap-2">
                            {/* Event dropdown */}
                            <select
                              value={item.event_name}
                              onChange={e => updateItem(index, 'event_name', e.target.value)}
                              className={selectClass}
                            >
                              <option value="">Event...</option>
                              {eventNames.map(e => (
                                <option key={e} value={e}>{e}</option>
                              ))}
                            </select>

                            {/* Property dropdown - only if event has grouped trackers */}
                            {item.event_name && properties.length > 0 && (
                              <select
                                value={item.property_name}
                                onChange={e => updateItem(index, 'property_name', e.target.value)}
                                className={selectClass}
                              >
                                <option value="">Property...</option>
                                {properties.map(p => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            )}

                            {/* Value dropdown - only if property selected */}
                            {item.property_name && (
                              <select
                                value={item.property_value}
                                onChange={e => updateItem(index, 'property_value', e.target.value)}
                                className={selectClass}
                                disabled={isLoadingVals}
                              >
                                <option value="">{isLoadingVals ? 'Loading...' : 'Value...'}</option>
                                {values.map(v => (
                                  <option key={v} value={v}>{v}</option>
                                ))}
                              </select>
                            )}
                          </div>

                          {/* Remove button */}
                          {items.length > 1 && (
                            <button
                              onClick={() => removeItem(index)}
                              className="p-1.5 mt-1 rounded hover:bg-bg-hover text-text-dim hover:text-error transition-colors shrink-0"
                            >
                              <Minus size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* Add row button */}
                    <button
                      type="button"
                      onClick={addRow}
                      className="flex items-center gap-1 text-[12px] text-text-dim hover:text-accent transition-colors mt-1 ml-6"
                    >
                      <Plus size={12} />
                      Add row
                    </button>
                  </div>
                )}
              </div>

              {error && <p className="text-error text-[12px]">{error}</p>}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-dim shrink-0">
              {!isEdit && (
                <button
                  onClick={() => setStep('type')}
                  className="px-4 py-2 text-[13px] text-text-dim hover:text-text-body transition-colors mr-auto"
                >
                  Back
                </button>
              )}
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
                {saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
