'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { X, Loader2, Minus, Plus, Table, LineChart, PieChart } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface DisplayItem {
  event_name: string;
  property_name: string;
  property_value: string;
}

interface DisplaySection {
  id: number;
  title: string;
  section_type: string;
  items: { event_name: string; property_name: string | null; property_value: string | null }[];
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

export default function AddDisplaySectionModal({ section, onClose, onSaved }: Props) {
  const { user } = useUser();
  const isEdit = !!section;

  const [step, setStep] = useState<'type' | 'config'>(isEdit ? 'config' : 'type');
  const [title, setTitle] = useState(section?.title || '');
  const [items, setItems] = useState<DisplayItem[]>(
    section?.items?.length ? section.items.map(i => ({
      event_name: i.event_name,
      property_name: i.property_name || '',
      property_value: i.property_value || '',
    })) : [{ event_name: '', property_name: '', property_value: '' }]
  );
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

  // Fetch property values
  const fetchValues = useCallback(async (eventName: string, propertyName: string) => {
    const cacheKey = `${eventName}::${propertyName}`;
    if (valuesCache[cacheKey] || loadingValues[cacheKey]) return;
    if (!user?.id || !eventName || !propertyName) return;

    setLoadingValues(prev => ({ ...prev, [cacheKey]: true }));
    try {
      const params = new URLSearchParams({ userId: user.id, eventName, propertyName });
      const res = await fetch(`${API_URL}/api/custom-events/values?${params}`);
      const json = await res.json();
      setValuesCache(prev => ({ ...prev, [cacheKey]: json.values || [] }));
    } catch {
      setValuesCache(prev => ({ ...prev, [cacheKey]: [] }));
    } finally {
      setLoadingValues(prev => ({ ...prev, [cacheKey]: false }));
    }
  }, [user?.id, valuesCache, loadingValues]);

  const addRow = () => {
    const lastItem = items[items.length - 1];
    setItems(prev => [...prev, {
      event_name: lastItem?.event_name || '',
      property_name: lastItem?.property_name || '',
      property_value: lastItem?.property_value || '',
    }]);
  };

  const updateItem = (index: number, field: keyof DisplayItem, value: string) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      // Reset dependent fields
      if (field === 'event_name') {
        next[index].property_name = '';
        next[index].property_value = '';
      }
      if (field === 'property_name') {
        next[index].property_value = '';
        if (value && next[index].event_name) {
          fetchValues(next[index].event_name, value);
        }
      }
      return next;
    });
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user?.id) return;

    // Filter to only valid items (at least event_name)
    const validItems = items.filter(i => i.event_name);
    if (validItems.length === 0) {
      setError('Add at least one row');
      return;
    }

    setSaving(true);
    setError('');

    const body = {
      userId: user.id,
      title: title.trim() || 'Untitled',
      section_type: 'table',
      items: validItems,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-bg-overlay" onClick={onClose} />
      <div className="relative bg-bg-surface border border-border-dim rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-dim shrink-0">
          <h2 className="text-[15px] font-semibold text-text-heading">
            {isEdit ? 'Edit Section' : step === 'type' ? 'Add Section' : 'Configure Table'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-bg-hover text-text-dim">
            <X size={16} />
          </button>
        </div>

        {step === 'type' ? (
          /* Step 1: Type picker */
          <div className="px-5 py-5 space-y-3">
            <button
              onClick={() => setStep('config')}
              className="w-full flex items-center gap-3 p-4 rounded-lg border border-border-dim hover:border-accent/50 hover:bg-bg-hover transition-colors text-left"
            >
              <Table size={20} className="text-accent shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-text-heading">Table</p>
                <p className="text-[11px] text-text-dim">Show counts for specific event/property combinations</p>
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
        ) : (
          /* Step 2: Table config */
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
