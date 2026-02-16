'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { X, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface EventSection {
  id: number;
  event_name: string;
  title: string | null;
  group_by_property: string | null;
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
  const [events, setEvents] = useState<string[]>([]);
  const [properties, setProperties] = useState<string[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
          <div>
            <label className={labelClass}>
              Event Name <span className="text-error text-[13px] leading-none">*</span>
            </label>
            {loadingEvents ? (
              <div className="flex items-center gap-2 px-3 py-2 text-[13px] text-text-dim">
                <Loader2 size={14} className="animate-spin" /> Loading events...
              </div>
            ) : events.length > 0 ? (
              <select
                value={eventName}
                onChange={e => {
                  setEventName(e.target.value);
                  setGroupByProperty('');
                }}
                className={inputClass}
              >
                <option value="">Select an event</option>
                {events.map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={eventName}
                onChange={e => {
                  setEventName(e.target.value);
                  setGroupByProperty('');
                }}
                placeholder="e.g. page_view, signup"
                className={inputClass}
              />
            )}
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
              Splits the bar chart by property values (e.g. country, source)
            </p>
          </div>

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
