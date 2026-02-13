'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { X, ChevronDown, Loader2, Eye, EyeOff, Pencil, Check } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface Connection {
  connected: boolean;
  accountId: string;
  updatedAt: string;
  maskedKey?: string;
  fullKey?: string;
  settings?: { purchaseEvent?: string; posthogHost?: string };
}

interface Connections {
  [platform: string]: Connection;
}

// Simple branded logo components
function PostHogLogo() {
  return (
    <div className="w-10 h-10 rounded-lg bg-[#1d4aff] flex items-center justify-center flex-shrink-0">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="#fff" opacity="0.9"/>
        <path d="M12 2L2 7l10 5 10-5L12 2z" fill="#fff"/>
      </svg>
    </div>
  );
}

function TikTokLogo() {
  return (
    <div className="w-10 h-10 rounded-lg bg-[#111] border border-border-dim flex items-center justify-center flex-shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.08a8.27 8.27 0 004.76 1.5V7.13a4.83 4.83 0 01-1-.44z" fill="#fff"/>
      </svg>
    </div>
  );
}

function MetaLogo() {
  return (
    <div className="w-10 h-10 rounded-lg bg-[#1877f2] flex items-center justify-center flex-shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#fff"/>
      </svg>
    </div>
  );
}

function StripeLogo() {
  return (
    <div className="w-10 h-10 rounded-lg bg-[#635bff] flex items-center justify-center flex-shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" fill="#fff"/>
      </svg>
    </div>
  );
}

function GoogleAdsLogo() {
  return (
    <div className="w-10 h-10 rounded-lg bg-[#4285f4] flex items-center justify-center flex-shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M3.272 20.1l4.29-16.2c.36-1.36 1.78-2.18 3.14-1.82l1.36.36c1.36.36 2.18 1.78 1.82 3.14l-4.29 16.2c-.36 1.36-1.78 2.18-3.14 1.82l-1.36-.36c-1.36-.36-2.18-1.78-1.82-3.14z" fill="#fff" opacity="0.7"/>
        <path d="M10.272 20.1l4.29-16.2c.36-1.36 1.78-2.18 3.14-1.82l1.36.36c1.36.36 2.18 1.78 1.82 3.14l-4.29 16.2c-.36 1.36-1.78 2.18-3.14 1.82l-1.36-.36c-1.36-.36-2.18-1.78-1.82-3.14z" fill="#fff"/>
        <circle cx="6" cy="20" r="2.5" fill="#fff"/>
      </svg>
    </div>
  );
}

function LinkedInLogo() {
  return (
    <div className="w-10 h-10 rounded-lg bg-[#0a66c2] flex items-center justify-center flex-shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#fff"/>
      </svg>
    </div>
  );
}

// Stripe configuration modal (API key pattern, like PostHog but simpler)
function StripeModal({
  userId,
  connection,
  onClose,
  onSaved,
}: {
  userId: string;
  connection?: Connection;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isConnected = !!connection?.connected;
  const [editing, setEditing] = useState(!isConnected);
  const [apiKey, setApiKey] = useState(connection?.fullKey || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'API Key is required.' });
      return;
    }
    if (!/^(sk|rk)_(test|live)_/.test(apiKey.trim())) {
      setMessage({ type: 'error', text: 'Must start with sk_ or rk_ (test or live).' });
      return;
    }
    setMessage(null);
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/settings/stripe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, apiKey: apiKey.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to save.' });
        return;
      }
      setMessage({ type: 'success', text: 'Saved!' });
      setEditing(false);
      onSaved();
    } catch {
      setMessage({ type: 'error', text: 'Network error.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-bg-overlay" onClick={onClose} />
      <div className="relative bg-bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-0">
          <div className="flex items-center gap-3">
            <StripeLogo />
            <div>
              <h2 className="text-[15px] font-semibold text-text-heading">Stripe</h2>
              <p className="text-[11px] text-text-dim">Revenue and customer data</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isConnected && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-md hover:bg-bg-hover text-text-dim hover:text-text-heading transition-colors"
                title="Edit credentials"
              >
                <Pencil size={14} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-bg-hover text-text-dim hover:text-text-body transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* API Key */}
        <div className="p-5 space-y-2">
          <CredentialField
            label="Stripe API Key"
            value={connection?.fullKey || ''}
            maskedValue={connection?.maskedKey}
            sensitive
            editing={editing}
            editValue={apiKey}
            onEditChange={setApiKey}
            placeholder="rk_live_... or sk_test_..."
          />

          {editing && (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 px-4 py-2 rounded-lg text-[12px] font-medium text-accent-text transition-colors"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                {saving ? 'Saving...' : 'Save'}
              </button>
              {isConnected && (
                <button
                  onClick={() => {
                    setEditing(false);
                    setMessage(null);
                    setApiKey(connection?.fullKey || '');
                  }}
                  className="px-4 py-2 rounded-lg text-[12px] font-medium text-text-dim hover:text-text-body transition-colors"
                >
                  Cancel
                </button>
              )}
              {message && (
                <p className={`text-[12px] ${message.type === 'success' ? 'text-success' : 'text-error'}`}>
                  {message.text}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Campaign Attribution Hint */}
        <div className="px-5 pb-5 pt-0">
          <div className="border-t border-border-dim pt-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-dim mb-1">Campaign Attribution (optional)</p>
            <p className="text-[11px] text-text-dim leading-relaxed">
              Revenue by country works automatically. To also track <strong className="text-text-body">profit per campaign</strong>, store the{' '}
              <code className="text-[10px] bg-bg-elevated px-1 py-0.5 rounded font-mono">utm_campaign</code>{' '}
              URL parameter in your Stripe customer&apos;s metadata when they sign up. MetricHQ reads this to attribute revenue to ad campaigns.
            </p>
            <a
              href="https://docs.stripe.com/metadata"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-[11px] text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
            >
              Learn how to add metadata in Stripe
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({
  name,
  description,
  logo,
  connected,
  onClick,
}: {
  name: string;
  description: string;
  logo: React.ReactNode;
  connected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3.5 w-full text-left p-4 rounded-xl border transition-colors ${
        connected
          ? 'bg-success-bg border-success/20 hover:bg-success-bg'
          : 'bg-bg-surface border-border-dim hover:bg-bg-elevated'
      }`}
    >
      {logo}
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-text-heading">{name}</p>
        <p className={`text-[11px] ${connected ? 'text-success' : 'text-text-dim'}`}>
          {connected ? 'Connected' : description}
        </p>
      </div>
    </button>
  );
}

// Credential field with eye toggle and inline edit
function CredentialField({
  label,
  value,
  maskedValue,
  sensitive,
  editing,
  editValue,
  onEditChange,
  placeholder,
}: {
  label: string;
  value: string;
  maskedValue?: string;
  sensitive?: boolean;
  editing: boolean;
  editValue: string;
  onEditChange: (v: string) => void;
  placeholder?: string;
}) {
  const [revealed, setRevealed] = useState(false);

  if (editing) {
    return (
      <div className="p-3 rounded-lg bg-bg-elevated border border-border-dim">
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-dim mb-1.5">{label}</p>
        <input
          type="text"
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-bg-body border border-border-dim rounded-md px-2.5 py-1.5 text-[13px] text-text-heading font-mono placeholder-text-dim/40 focus:outline-none focus:border-accent/40 transition-colors"
          autoComplete="off"
        />
      </div>
    );
  }

  const display = sensitive
    ? (revealed ? value : (maskedValue || '••••••••••••'))
    : value || '—';

  return (
    <div className="p-3 rounded-lg bg-bg-elevated border border-border-dim">
      <p className="text-[10px] font-medium uppercase tracking-wider text-text-dim mb-1.5">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-mono text-text-body truncate">{display}</p>
        {sensitive && value && (
          <button
            onClick={() => setRevealed(!revealed)}
            className="text-text-dim hover:text-text-body transition-colors flex-shrink-0"
          >
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

// PostHog configuration modal
function PostHogModal({
  userId,
  connection,
  onClose,
  onSaved,
}: {
  userId: string;
  connection?: Connection;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isConnected = !!connection?.connected;

  // Edit mode — pre-fill with existing values so nothing disappears
  const [editing, setEditing] = useState(!isConnected);
  const [apiKey, setApiKey] = useState(connection?.fullKey || '');
  const [projectId, setProjectId] = useState(connection?.accountId || '');
  const [posthogHost, setPosthogHost] = useState(connection?.settings?.posthogHost || 'https://us.posthog.com');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Event selection
  const [events, setEvents] = useState<string[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState(connection?.settings?.purchaseEvent || '');
  const [savingEvent, setSavingEvent] = useState(false);
  const [manualEvent, setManualEvent] = useState('');

  useEffect(() => {
    if (isConnected) fetchEvents();
  }, [isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchEvents = async () => {
    setLoadingEvents(true);
    setEventsError(null);
    try {
      const params = new URLSearchParams({ userId });
      const res = await fetch(`${API_URL}/api/posthog/events?${params}`);
      const json = await res.json();
      if (res.ok) {
        setEvents(json.events || []);
      } else {
        setEventsError(json.detail || json.error || 'Failed to load events');
      }
    } catch {
      setEventsError('Network error loading events');
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim() || !projectId.trim()) {
      setMessage({ type: 'error', text: 'API Key and Project ID are required.' });
      return;
    }
    setMessage(null);
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/settings/posthog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          apiKey: apiKey.trim(),
          projectId: projectId.trim(),
          posthogHost: posthogHost.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to save.' });
        return;
      }
      setMessage({ type: 'success', text: 'Saved!' });
      setEditing(false);
      onSaved();
      setTimeout(fetchEvents, 500);
    } catch {
      setMessage({ type: 'error', text: 'Network error.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEvent = async (eventName: string) => {
    setSelectedEvent(eventName);
    setSavingEvent(true);
    try {
      await fetch(`${API_URL}/api/settings/posthog/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, purchaseEvent: eventName }),
      });
      onSaved();
    } catch {
      // silently fail
    } finally {
      setSavingEvent(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-bg-overlay" onClick={onClose} />
      <div className="relative bg-bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-0">
          <div className="flex items-center gap-3">
            <PostHogLogo />
            <div>
              <h2 className="text-[15px] font-semibold text-text-heading">PostHog</h2>
              <p className="text-[11px] text-text-dim">Revenue and purchase data</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isConnected && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-md hover:bg-bg-hover text-text-dim hover:text-text-heading transition-colors"
                title="Edit credentials"
              >
                <Pencil size={14} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-bg-hover text-text-dim hover:text-text-body transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Credentials */}
        <div className="p-5 space-y-2">
          <CredentialField
            label="API Key"
            value={connection?.fullKey || ''}
            maskedValue={connection?.maskedKey}
            sensitive
            editing={editing}
            editValue={apiKey}
            onEditChange={setApiKey}
            placeholder="phx_..."
          />
          <CredentialField
            label="Project ID"
            value={connection?.accountId || ''}
            editing={editing}
            editValue={projectId}
            onEditChange={setProjectId}
            placeholder="12345"
          />
          <CredentialField
            label="Host"
            value={connection?.settings?.posthogHost || ''}
            editing={editing}
            editValue={posthogHost}
            onEditChange={setPosthogHost}
            placeholder="https://us.posthog.com"
          />

          {/* Save / Cancel when editing */}
          {editing && (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 px-4 py-2 rounded-lg text-[12px] font-medium text-accent-text transition-colors"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                {saving ? 'Saving...' : 'Save'}
              </button>
              {isConnected && (
                <button
                  onClick={() => {
                    setEditing(false);
                    setMessage(null);
                    setApiKey(connection?.fullKey || '');
                    setProjectId(connection?.accountId || '');
                    setPosthogHost(connection?.settings?.posthogHost || 'https://us.posthog.com');
                  }}
                  className="px-4 py-2 rounded-lg text-[12px] font-medium text-text-dim hover:text-text-body transition-colors"
                >
                  Cancel
                </button>
              )}
              {message && (
                <p className={`text-[12px] ${message.type === 'success' ? 'text-success' : 'text-error'}`}>
                  {message.text}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Purchase Event — always visible */}
        <div className="px-5 pb-5 pt-0">
          <div className="border-t border-border-dim pt-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-dim mb-1">Purchase Event</p>
            <p className="text-[11px] text-text-dim mb-3">
              The event that represents a purchase (from RevenueCat or your setup)
            </p>

            {loadingEvents ? (
              <div className="flex items-center gap-2 text-text-dim text-[12px] py-1">
                <Loader2 size={14} className="animate-spin" /> Loading events from PostHog...
              </div>
            ) : events.length > 0 ? (
              <div className="relative">
                <select
                  value={selectedEvent}
                  onChange={(e) => handleSaveEvent(e.target.value)}
                  disabled={savingEvent}
                  className="w-full appearance-none bg-bg-body border border-border-dim rounded-lg px-3 py-2.5 pr-8 text-[13px] text-text-heading focus:outline-none focus:border-accent/40 transition-colors"
                >
                  <option value="">Select an event...</option>
                  {events.map((ev) => (
                    <option key={ev} value={ev}>{ev}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
              </div>
            ) : (
              <div className="space-y-2">
                {eventsError && (
                  <p className="text-[11px] text-error">{eventsError}</p>
                )}
                <p className="text-[11px] text-text-dim">
                  {isConnected ? 'Could not load events. Enter the event name manually:' : 'Connect PostHog above to load events, or enter manually:'}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualEvent || selectedEvent}
                    onChange={(e) => setManualEvent(e.target.value)}
                    placeholder="e.g. rc_initial_purchase"
                    className="flex-1 bg-bg-body border border-border-dim rounded-lg px-3 py-2 text-[13px] text-text-heading font-mono placeholder-text-dim/40 focus:outline-none focus:border-accent/40 transition-colors"
                  />
                  <button
                    onClick={() => { if (manualEvent.trim()) handleSaveEvent(manualEvent.trim()); }}
                    disabled={!manualEvent.trim() || savingEvent}
                    className="bg-accent hover:bg-accent-hover disabled:opacity-50 px-3 py-2 rounded-lg text-[12px] font-medium text-accent-text transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {selectedEvent && (
              <p className="mt-2.5 text-[11px] text-success flex items-center gap-1.5">
                <Check size={12} /> Using: <span className="font-mono">{selectedEvent}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// TikTok / Meta modal (simple — just shows status and connect link)
function OAuthModal({
  platform,
  logo,
  name,
  description,
  userId,
  connection,
  onClose,
}: {
  platform: string;
  logo: React.ReactNode;
  name: string;
  description: string;
  userId: string;
  connection?: Connection;
  onClose: () => void;
}) {
  const isConnected = !!connection?.connected;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-bg-overlay" onClick={onClose} />
      <div className="relative bg-bg-surface border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {logo}
            <div>
              <h2 className="text-[15px] font-semibold text-text-heading">{name}</h2>
              <p className="text-[11px] text-text-dim">{description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-dim hover:text-text-body transition-colors">
            <X size={16} />
          </button>
        </div>

        {isConnected && (
          <div className="mb-5 p-3 rounded-lg bg-bg-elevated border border-border-dim">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-dim mb-2">Connected account</p>
            <p className="text-[12px] font-mono text-text-body">{connection.accountId || 'N/A'}</p>
          </div>
        )}

        <a
          href={`${API_URL}/auth/${platform}?userId=${encodeURIComponent(userId)}`}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover px-4 py-2.5 rounded-lg text-[12px] font-medium text-accent-text transition-colors"
        >
          {isConnected ? 'Reconnect' : 'Connect'} {name}
        </a>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const { user } = useUser();
  const [connections, setConnections] = useState<Connections>({});
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    if (!user?.id) return;
    try {
      const params = new URLSearchParams({ userId: user.id });
      const response = await fetch(`${API_URL}/api/connections?${params}`);
      const json = await response.json();
      if (response.ok) {
        setConnections(json.connections || {});
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-dim text-[13px]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Revenue source */}
      <div>
        <h2 className="text-[13px] font-semibold text-text-heading mb-1">Revenue</h2>
        <p className="text-[11px] text-text-dim mb-3">Connect your analytics to track revenue and purchases</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <IntegrationCard
            name="PostHog"
            description="Configure integration"
            logo={<PostHogLogo />}
            connected={!!connections.posthog}
            onClick={() => setOpenModal('posthog')}
          />
          <IntegrationCard
            name="Stripe"
            description="Configure integration"
            logo={<StripeLogo />}
            connected={!!connections.stripe}
            onClick={() => setOpenModal('stripe')}
          />
        </div>
      </div>

      {/* Ad platforms */}
      <div>
        <h2 className="text-[13px] font-semibold text-text-heading mb-1">Ad Platforms</h2>
        <p className="text-[11px] text-text-dim mb-3">Connect ad accounts to track spend by campaign and country</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <IntegrationCard
            name="TikTok Ads"
            description="Configure integration"
            logo={<TikTokLogo />}
            connected={!!connections.tiktok}
            onClick={() => setOpenModal('tiktok')}
          />
          <IntegrationCard
            name="Meta Ads"
            description="Configure integration"
            logo={<MetaLogo />}
            connected={!!connections.meta}
            onClick={() => setOpenModal('meta')}
          />
          <IntegrationCard
            name="Google Ads"
            description="Configure integration"
            logo={<GoogleAdsLogo />}
            connected={!!connections.google_ads}
            onClick={() => setOpenModal('google_ads')}
          />
          <IntegrationCard
            name="LinkedIn Ads"
            description="Configure integration"
            logo={<LinkedInLogo />}
            connected={!!connections.linkedin}
            onClick={() => setOpenModal('linkedin')}
          />
        </div>
      </div>

      {/* Modals */}
      {openModal === 'posthog' && user?.id && (
        <PostHogModal
          userId={user.id}
          connection={connections.posthog}
          onClose={() => setOpenModal(null)}
          onSaved={fetchConnections}
        />
      )}
      {openModal === 'tiktok' && user?.id && (
        <OAuthModal
          platform="tiktok"
          logo={<TikTokLogo />}
          name="TikTok Ads"
          description="Campaign spend and performance"
          userId={user.id}
          connection={connections.tiktok}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === 'meta' && user?.id && (
        <OAuthModal
          platform="meta"
          logo={<MetaLogo />}
          name="Meta Ads"
          description="Facebook & Instagram ad spend"
          userId={user.id}
          connection={connections.meta}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === 'stripe' && user?.id && (
        <StripeModal
          userId={user.id}
          connection={connections.stripe}
          onClose={() => setOpenModal(null)}
          onSaved={fetchConnections}
        />
      )}
      {openModal === 'google_ads' && user?.id && (
        <OAuthModal
          platform="google"
          logo={<GoogleAdsLogo />}
          name="Google Ads"
          description="Search and display ad spend"
          userId={user.id}
          connection={connections.google_ads}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === 'linkedin' && user?.id && (
        <OAuthModal
          platform="linkedin"
          logo={<LinkedInLogo />}
          name="LinkedIn Ads"
          description="B2B campaign spend"
          userId={user.id}
          connection={connections.linkedin}
          onClose={() => setOpenModal(null)}
        />
      )}
    </div>
  );
}
