'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { X, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface EventSection {
  id: number;
  event_name: string;
  title: string | null;
  group_by_property: string | null;
  property_value_contains: string | null;
  display_order: number;
}

interface Props {
  section: EventSection | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddEventSectionModal({ section, onClose, onSaved }: Props) {
  const { user } = useUser();
  const isEdit = !!section;

  const [eventName, setEventName] = useState(section?.event_name || '');
  const [title, setTitle] = useState(section?.title || '');
  const [groupByProperty, setGroupByProperty] = useState(section?.group_by_property || '');
  const [valueContains, setValueContains] = useState(section?.property_value_contains || '');
  const [events, setEvents] = useState<string[]>([]);
  const [properties, setProperties] = useState<string[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);
  const eventRef = useRef<HTMLDivElement>(null);

  // Fetch available events
  useEffect(() => {
    if (!user?.id) return;
    setLoadingEvents(true);
    fetch(`${API_URL}/api/posthog/events?userId=${encodeURIComponent(user.id)}`)
      .then(r => r.json())
      .then(j => setEvents(j.events || []))
      .catch(() => {})
      .finally(() => setLoadingEvents(false));
  }, [user?.id]);

  // Close event dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (eventRef.current && !eventRef.current.contains(e.target as Node)) {
        setEventDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch properties when event changes
  useEffect(() => {
    if (!user?.id || !eventName) {
      setProperties([]);
      return;
    }
    setLoadingProperties(true);
    const params = new URLSearchParams({ userId: user.id, eventName });
    fetch(`${API_URL}/api/custom-events/properties?${params}`)
      .then(r => r.json())
      .then(j => setProperties(j.properties || []))
      .catch(() => setProperties([]))
      .finally(() => setLoadingProperties(false));
  }, [user?.id, eventName]);

  const handleSubmit = async () => {
    if (!user?.id || !eventName.trim()) {
      setError('Event name is required');
      return;
    }

    setSaving(true);
    setError('');

    const body: Record<string, unknown> = {
      userId: user.id,
      event_name: eventName.trim(),
      title: title.trim() || null,
      group_by_property: groupByProperty.trim() || null,
      property_value_contains: valueContains.trim() || null,
    };

    try {
      const url = isEdit
        ? `${API_URL}/api/custom-events/sections/${section.id}`
        : `${API_URL}/api/custom-events/sections`;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-bg-overlay" onClick={onClose} />
      <div className="relative bg-bg-surface border border-border-dim rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-dim">
          <h2 className="text-[15px] font-semibold text-text-heading">
            {isEdit ? 'Edit Event Tracker' : 'Add Event Tracker'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-bg-hover text-text-dim">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Event name */}
          <div ref={eventRef}>
            <label className={labelClass}>
              Event Name <span className="text-error text-[13px] leading-none">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={eventName}
                onChange={e => {
                  setEventName(e.target.value);
                  setGroupByProperty('');
                  setEventDropdownOpen(true);
                }}
                onFocus={() => setEventDropdownOpen(true)}
                placeholder="Type or select an event name"
                className={inputClass}
              />
              {loadingEvents && (
                <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-text-dim" />
              )}
              {eventDropdownOpen && events.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-bg-elevated border border-border-dim rounded-lg shadow-lg z-10 py-1 max-h-[200px] overflow-y-auto">
                  {events
                    .filter(e => !eventName || e.toLowerCase().includes(eventName.toLowerCase()))
                    .map(e => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => {
                          setEventName(e);
                          setGroupByProperty('');
                          setEventDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-1.5 text-[12px] text-left transition-colors ${
                          e === eventName ? 'text-accent bg-accent/5' : 'text-text-body hover:bg-bg-hover'
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className={labelClass}>Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={eventName || 'Optional display title'}
              className={inputClass}
            />
          </div>

          {/* Group by property */}
          <div>
            <label className={labelClass}>Group by property</label>
            {loadingProperties ? (
              <div className="flex items-center gap-2 px-3 py-2 text-[13px] text-text-dim">
                <Loader2 size={14} className="animate-spin" /> Loading properties...
              </div>
            ) : properties.length > 0 ? (
              <select
                value={groupByProperty}
                onChange={e => setGroupByProperty(e.target.value)}
                className={inputClass}
              >
                <option value="">None (total count only)</option>
                {properties.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={groupByProperty}
                onChange={e => setGroupByProperty(e.target.value)}
                placeholder="Optional property name"
                className={inputClass}
                disabled={!eventName}
              />
            )}
            <p className="text-[10px] text-text-dim/60 mt-1">
              Breaks down counts by property values (e.g. country, source)
            </p>
          </div>

          {/* Value contains filter — only when grouped */}
          {groupByProperty && (
            <div>
              <label className={labelClass}>Value contains</label>
              <input
                type="text"
                value={valueContains}
                onChange={e => setValueContains(e.target.value)}
                placeholder="e.g. v2_"
                className={inputClass}
              />
              <p className="text-[10px] text-text-dim/60 mt-1">
                Only sync values that contain this text (leave empty for all)
              </p>
            </div>
          )}

          {/* Error */}
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
            onClick={handleSubmit}
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
