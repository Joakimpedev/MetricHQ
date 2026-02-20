'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { X, ChevronDown, Loader2, Eye, EyeOff, Pencil, Check, Lock, Pause } from 'lucide-react';
import { useSubscription } from '../../../components/SubscriptionProvider';
import { PostHogLogo, TikTokLogo, MetaLogo, StripeLogo, GoogleAdsLogo, LinkedInLogo, RevenueCatLogo } from '../../../components/PlatformLogos';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface Connection {
  connected: boolean;
  accountId: string;
  updatedAt: string;
  createdAt?: string;
  maskedKey?: string;
  fullKey?: string;
  settings?: { purchaseEvent?: string; posthogHost?: string };
}

interface Connections {
  [platform: string]: Connection;
}

// Stripe configuration modal (API key pattern, like PostHog but simpler)
function StripeModal({
  userId,
  connection,
  onClose,
  onSaved,
  onDisconnect,
}: {
  userId: string;
  connection?: Connection;
  onClose: () => void;
  onSaved: () => void;
  onDisconnect?: () => void;
}) {
  const isConnected = !!connection?.connected;
  const [editing, setEditing] = useState(!isConnected);
  const [apiKey, setApiKey] = useState(connection?.fullKey || '');
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Stripe? Your synced data will be removed.')) return;
    setDisconnecting(true);
    try {
      if (onDisconnect) onDisconnect();
    } finally {
      setDisconnecting(false);
    }
  };

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

          {isConnected && !editing && (
            <div className="border-t border-border-dim pt-4 mt-4">
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-[12px] font-medium text-error hover:bg-error/10 px-3 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                {disconnecting ? 'Disconnecting...' : 'Disconnect Stripe'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// RevenueCat configuration modal (API key + webhook URL)
function RevenueCatModal({
  userId,
  connection,
  onClose,
  onSaved,
  onDisconnect,
}: {
  userId: string;
  connection?: Connection;
  onClose: () => void;
  onSaved: () => void;
  onDisconnect?: () => void;
}) {
  const isConnected = !!connection?.connected;
  const [editing, setEditing] = useState(!isConnected);
  const [apiKey, setApiKey] = useState(connection?.fullKey || '');
  const [projectId, setProjectId] = useState(connection?.accountId || '');
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${API_URL}/api/webhooks/revenuecat`;

  const handleDisconnect = async () => {
    if (!confirm('Disconnect RevenueCat? Your synced data will be removed.')) return;
    setDisconnecting(true);
    try {
      if (onDisconnect) onDisconnect();
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim() || !projectId.trim()) {
      setMessage({ type: 'error', text: 'Secret API Key and Project ID are required.' });
      return;
    }
    if (!/^sk_/.test(apiKey.trim())) {
      setMessage({ type: 'error', text: 'API Key must start with sk_' });
      return;
    }
    setMessage(null);
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/settings/revenuecat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, apiKey: apiKey.trim(), projectId: projectId.trim() }),
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

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-bg-overlay" onClick={onClose} />
      <div className="relative bg-bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-0">
          <div className="flex items-center gap-3">
            <RevenueCatLogo />
            <div>
              <h2 className="text-[15px] font-semibold text-text-heading">RevenueCat</h2>
              <p className="text-[11px] text-text-dim">In-app purchase revenue</p>
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
            label="Secret API Key"
            value={connection?.fullKey || ''}
            maskedValue={connection?.maskedKey}
            sensitive
            editing={editing}
            editValue={apiKey}
            onEditChange={setApiKey}
            placeholder="sk_..."
          />
          <CredentialField
            label="Project ID"
            value={connection?.accountId || ''}
            editing={editing}
            editValue={projectId}
            onEditChange={setProjectId}
            placeholder="proj1a2b3c4d"
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
                    setProjectId(connection?.accountId || '');
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

        <div className="px-5 pb-5 pt-0">
          {isConnected && !editing && (
            <div className="border-t border-border-dim pt-4 mt-4">
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-[12px] font-medium text-error hover:bg-error/10 px-3 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                {disconnecting ? 'Disconnecting...' : 'Disconnect RevenueCat'}
              </button>
            </div>
          )}
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
  locked,
  paused,
  upgradePlanName,
}: {
  name: string;
  description: string;
  logo: React.ReactNode;
  connected: boolean;
  onClick: () => void;
  locked?: boolean;
  paused?: boolean;
  upgradePlanName?: string;
}) {
  const planLabel = upgradePlanName || 'a higher plan';

  if (locked) {
    return (
      <Link
        href="/pricing"
        className="flex items-center gap-3.5 w-full text-left p-4 rounded-xl border border-border-dim bg-bg-surface opacity-60 hover:opacity-80 transition-opacity"
      >
        <div className="relative">
          {logo}
          <Lock size={12} className="absolute -bottom-0.5 -right-0.5 text-text-dim bg-bg-surface rounded-full p-0.5" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-text-heading">{name}</p>
          <p className="text-[11px] text-text-dim">
            <span className="text-accent">Upgrade to {planLabel}</span> to connect
          </p>
        </div>
      </Link>
    );
  }

  if (paused) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-3.5 w-full text-left p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10 transition-colors"
      >
        <div className="relative">
          {logo}
          <Pause size={12} className="absolute -bottom-0.5 -right-0.5 text-yellow-500 bg-bg-surface rounded-full p-0.5" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-text-heading">{name}</p>
          <p className="text-[11px] text-yellow-600 dark:text-yellow-400">
            Paused — limited to 1 platform · <Link href="/pricing" className="underline">Upgrade to {planLabel}</Link>
          </p>
        </div>
      </button>
    );
  }

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
  onDisconnect,
}: {
  userId: string;
  connection?: Connection;
  onClose: () => void;
  onSaved: () => void;
  onDisconnect?: () => void;
}) {
  const isConnected = !!connection?.connected;

  // Edit mode — pre-fill with existing values so nothing disappears
  const [editing, setEditing] = useState(!isConnected);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    if (!confirm('Disconnect PostHog? Your synced data will be removed.')) return;
    setDisconnecting(true);
    try {
      if (onDisconnect) onDisconnect();
    } finally {
      setDisconnecting(false);
    }
  };
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
              <div className="mt-2.5 flex items-center justify-between">
                <p className="text-[11px] text-success flex items-center gap-1.5">
                  <Check size={12} /> Using: <span className="font-mono">{selectedEvent}</span>
                </p>
                <button
                  onClick={async () => {
                    if (!confirm('Remove purchase event? This will clear all PostHog revenue data from your dashboard.')) return;
                    setSavingEvent(true);
                    try {
                      const params = new URLSearchParams({ userId });
                      await fetch(`${API_URL}/api/settings/posthog/event?${params}`, { method: 'DELETE' });
                      setSelectedEvent('');
                      onSaved();
                    } catch { /* ignore */ } finally {
                      setSavingEvent(false);
                    }
                  }}
                  disabled={savingEvent}
                  className="text-[11px] text-error hover:bg-error/10 px-2 py-1 rounded transition-colors disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            )}

            {isConnected && !editing && (
              <div className="border-t border-border-dim pt-4 mt-4">
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="text-[12px] font-medium text-error hover:bg-error/10 px-3 py-2 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {disconnecting ? 'Disconnecting...' : 'Disconnect PostHog'}
                </button>
              </div>
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
  onDisconnect,
}: {
  platform: string;
  logo: React.ReactNode;
  name: string;
  description: string;
  userId: string;
  connection?: Connection;
  onClose: () => void;
  onDisconnect?: () => void;
}) {
  const isConnected = !!connection?.connected;
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    if (!confirm(`Disconnect ${name}? Your synced data will be removed.`)) return;
    setDisconnecting(true);
    try {
      if (onDisconnect) onDisconnect();
    } finally {
      setDisconnecting(false);
    }
  };

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

        <div className="flex items-center gap-3">
          <a
            href={`${API_URL}/auth/${platform}?userId=${encodeURIComponent(userId)}`}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover px-4 py-2.5 rounded-lg text-[12px] font-medium text-accent-text transition-colors"
          >
            {isConnected ? 'Reconnect' : 'Connect'} {name}
          </a>
          {isConnected && (
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="px-4 py-2.5 rounded-lg text-[12px] font-medium text-error hover:bg-error/10 disabled:opacity-50 transition-colors"
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const { subscription, loading: subLoading } = useSubscription();
  const [connections, setConnections] = useState<Connections>({});
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState<string | null>(null);

  const platformLimitError = searchParams.get('error') === 'platform_limit';

  // Determine which ad platforms are active, paused, or locked
  const adPlatformKeys = ['tiktok', 'meta', 'google_ads', 'linkedin'] as const;
  const connectedAdPlatforms = adPlatformKeys
    .filter(p => connections[p]?.connected)
    .sort((a, b) => {
      const aDate = connections[a]?.createdAt || '';
      const bDate = connections[b]?.createdAt || '';
      return aDate.localeCompare(bDate);
    });
  const connectedAdCount = connectedAdPlatforms.length;
  const maxAd = subscription?.limits?.maxAdPlatforms ?? Infinity;
  const atAdLimit = connectedAdCount >= maxAd && maxAd !== Infinity;

  // Suggest the right upgrade target: starter → Growth, growth → Pro
  const currentPlan = subscription?.plan?.toLowerCase();
  const adUpgradePlan = currentPlan === 'starter' ? 'Growth' : currentPlan === 'growth' ? 'Pro' : 'Growth';

  // Platforms beyond the limit are "paused" (oldest stays active)
  const pausedPlatforms = new Set<string>();
  if (maxAd !== Infinity && connectedAdCount > maxAd) {
    connectedAdPlatforms.slice(maxAd).forEach(p => pausedPlatforms.add(p));
  }

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

  const handleDisconnect = useCallback(async (platform: string) => {
    if (!user?.id) return;
    try {
      const params = new URLSearchParams({ userId: user.id });
      await fetch(`${API_URL}/api/connections/${platform}?${params}`, { method: 'DELETE' });
      setOpenModal(null);
      fetchConnections();
    } catch {
      // silently fail
    }
  }, [user?.id, fetchConnections]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  if (loading || subLoading) {
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
          <IntegrationCard
            name="RevenueCat"
            description="Configure integration"
            logo={<RevenueCatLogo />}
            connected={!!connections.revenuecat}
            onClick={() => setOpenModal('revenuecat')}
          />
        </div>
      </div>

      {/* Ad platforms */}
      <div>
        <h2 className="text-[13px] font-semibold text-text-heading mb-1">Ad Platforms</h2>
        <p className="text-[11px] text-text-dim mb-3">Connect ad accounts to track spend by campaign and country</p>

        {platformLimitError && (
          <div className="mb-3 p-3 rounded-lg bg-error/10 border border-error/20 text-[12px] text-error">
            Your plan allows {maxAd} ad platform{maxAd !== 1 ? 's' : ''}. Upgrade to connect more.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <IntegrationCard
            name="TikTok Ads"
            description="Configure integration"
            logo={<TikTokLogo />}
            connected={!!connections.tiktok}
            onClick={() => setOpenModal('tiktok')}
            locked={atAdLimit && !connections.tiktok?.connected}
            paused={pausedPlatforms.has('tiktok')}
            upgradePlanName={adUpgradePlan}
          />
          <IntegrationCard
            name="Meta Ads"
            description="Configure integration"
            logo={<MetaLogo />}
            connected={!!connections.meta}
            onClick={() => setOpenModal('meta')}
            locked={atAdLimit && !connections.meta?.connected}
            paused={pausedPlatforms.has('meta')}
            upgradePlanName={adUpgradePlan}
          />
          <IntegrationCard
            name="Google Ads"
            description="Configure integration"
            logo={<GoogleAdsLogo />}
            connected={!!connections.google_ads}
            onClick={() => setOpenModal('google_ads')}
            locked={atAdLimit && !connections.google_ads?.connected}
            paused={pausedPlatforms.has('google_ads')}
            upgradePlanName={adUpgradePlan}
          />
          <IntegrationCard
            name="LinkedIn Ads"
            description="Configure integration"
            logo={<LinkedInLogo />}
            connected={!!connections.linkedin}
            onClick={() => setOpenModal('linkedin')}
            locked={atAdLimit && !connections.linkedin?.connected}
            paused={pausedPlatforms.has('linkedin')}
            upgradePlanName={adUpgradePlan}
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
          onDisconnect={() => handleDisconnect('posthog')}
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
          onDisconnect={() => handleDisconnect('tiktok')}
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
          onDisconnect={() => handleDisconnect('meta')}
        />
      )}
      {openModal === 'stripe' && user?.id && (
        <StripeModal
          userId={user.id}
          connection={connections.stripe}
          onClose={() => setOpenModal(null)}
          onSaved={fetchConnections}
          onDisconnect={() => handleDisconnect('stripe')}
        />
      )}
      {openModal === 'revenuecat' && user?.id && (
        <RevenueCatModal
          userId={user.id}
          connection={connections.revenuecat}
          onClose={() => setOpenModal(null)}
          onSaved={fetchConnections}
          onDisconnect={() => handleDisconnect('revenuecat')}
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
          onDisconnect={() => handleDisconnect('google_ads')}
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
          onDisconnect={() => handleDisconnect('linkedin')}
        />
      )}
    </div>
  );
}
