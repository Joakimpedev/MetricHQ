'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Check, Loader2, Lock, ArrowRight } from 'lucide-react';
import { useSubscription } from './SubscriptionProvider';
import { GoogleAdsLogo, MetaLogo, TikTokLogo, LinkedInLogo, StripeLogo, PostHogLogo } from './PlatformLogos';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

const STORAGE_KEY = 'metrichq-onboarding-step';

interface Connections {
  [platform: string]: { connected: boolean; [key: string]: unknown };
}

interface OnboardingWizardProps {
  userId: string;
  onComplete: () => void;
}

// --- Step indicator ---

function StepIndicator({ currentStep, completedSteps }: { currentStep: number; completedSteps: Set<number> }) {
  const steps = [
    { num: 1, label: 'Ad platforms' },
    { num: 2, label: 'Revenue' },
    { num: 3, label: 'Sync' },
  ];

  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((s, i) => {
        const isCompleted = completedSteps.has(s.num);
        const isActive = s.num === currentStep;
        const isFuture = !isCompleted && !isActive;

        return (
          <div key={s.num} className="flex items-center">
            {i > 0 && (
              <div className={`w-12 h-px ${isCompleted || isActive ? 'bg-accent' : 'bg-border-dim'}`} />
            )}
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold transition-colors ${
                  isCompleted
                    ? 'bg-accent text-accent-text'
                    : isActive
                    ? 'bg-accent text-accent-text'
                    : 'bg-bg-elevated text-text-dim'
                }`}
              >
                {isCompleted ? <Check size={14} /> : s.num}
              </div>
              <span className={`text-[12px] ${isFuture ? 'text-text-dim' : 'text-text-body'}`}>
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Ad platform card ---

function AdPlatformCard({
  name,
  logo,
  connected,
  locked,
  onClick,
}: {
  name: string;
  logo: React.ReactNode;
  connected: boolean;
  locked: boolean;
  onClick: () => void;
}) {
  if (locked) {
    return (
      <div className="flex flex-col items-center gap-2 p-5 rounded-xl border border-border-dim bg-bg-surface opacity-50 cursor-not-allowed">
        <div className="relative">
          {logo}
          <Lock size={12} className="absolute -bottom-0.5 -right-0.5 text-text-dim bg-bg-surface rounded-full p-0.5" />
        </div>
        <p className="text-[12px] font-medium text-text-heading">{name}</p>
        <p className="text-[10px] text-text-dim">Upgrade to connect</p>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-5 rounded-xl border transition-colors ${
        connected
          ? 'bg-success-bg border-success/20'
          : 'bg-bg-surface border-border-dim hover:bg-bg-elevated hover:border-accent/30'
      }`}
    >
      {logo}
      <p className="text-[12px] font-medium text-text-heading">{name}</p>
      {connected ? (
        <span className="flex items-center gap-1 text-[11px] text-success">
          <Check size={12} /> Connected
        </span>
      ) : (
        <span className="text-[11px] text-text-dim">Click to connect</span>
      )}
    </button>
  );
}

// --- Revenue card ---

function RevenueCard({
  name,
  logo,
  connected,
  expanded,
  onClick,
  children,
}: {
  name: string;
  logo: React.ReactNode;
  connected: boolean;
  expanded: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border transition-colors ${
      connected ? 'bg-success-bg border-success/20' : 'bg-bg-surface border-border-dim'
    }`}>
      <button
        onClick={onClick}
        className="flex items-center gap-3.5 w-full text-left p-4"
      >
        {logo}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-text-heading">{name}</p>
          {connected ? (
            <span className="flex items-center gap-1 text-[11px] text-success">
              <Check size={12} /> Connected
            </span>
          ) : (
            <span className="text-[11px] text-text-dim">Click to configure</span>
          )}
        </div>
      </button>
      {expanded && !connected && (
        <div className="px-4 pb-4 border-t border-border-dim/50 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

// --- Main wizard ---

export default function OnboardingWizard({ userId, onComplete }: OnboardingWizardProps) {
  const { subscription } = useSubscription();
  const [step, setStep] = useState(1);
  const [connections, setConnections] = useState<Connections>({});
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [skippedAll, setSkippedAll] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stripe form state
  const [stripeKey, setStripeKey] = useState('');
  const [stripeSaving, setStripeSaving] = useState(false);
  const [stripeError, setStripeError] = useState('');

  // PostHog form state
  const [phKey, setPhKey] = useState('');
  const [phProject, setPhProject] = useState('');
  const [phHost, setPhHost] = useState('https://us.posthog.com');
  const [phSaving, setPhSaving] = useState(false);
  const [phError, setPhError] = useState('');

  // Restore step from sessionStorage (after OAuth redirect)
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (parsed >= 1 && parsed <= 3) setStep(parsed);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Fetch connections
  const fetchConnections = useCallback(async () => {
    try {
      const params = new URLSearchParams({ userId });
      const res = await fetch(`${API_URL}/api/connections?${params}`);
      const json = await res.json();
      if (res.ok) setConnections(json.connections || {});
    } catch {
      // silent
    }
  }, [userId]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Poll connections on steps 1-2 to detect OAuth returns
  useEffect(() => {
    if (step > 2) return;
    const interval = setInterval(fetchConnections, 3000);
    return () => clearInterval(interval);
  }, [step, fetchConnections]);

  // Tier limits
  const adPlatformKeys = ['tiktok', 'meta', 'google_ads', 'linkedin'];
  const connectedAdCount = adPlatformKeys.filter((p) => connections[p]?.connected).length;
  const maxAd = subscription?.limits?.maxAdPlatforms ?? Infinity;
  const atAdLimit = connectedAdCount >= maxAd && maxAd !== Infinity;

  const hasAnyAdConnected = connectedAdCount > 0;
  const hasAnyRevenueConnected = !!connections.stripe?.connected || !!connections.posthog?.connected;
  const hasAnyConnected = hasAnyAdConnected || hasAnyRevenueConnected;

  // OAuth redirect for ad platforms
  const connectAdPlatform = (platform: string) => {
    sessionStorage.setItem(STORAGE_KEY, String(step));
    const authPlatform = platform === 'google_ads' ? 'google' : platform;
    window.location.href = `${API_URL}/auth/${authPlatform}?userId=${encodeURIComponent(userId)}&returnTo=/dashboard`;
  };

  // Save Stripe key
  const handleStripeSave = async () => {
    if (!stripeKey.trim()) {
      setStripeError('API key is required.');
      return;
    }
    if (!/^(sk|rk)_(test|live)_/.test(stripeKey.trim())) {
      setStripeError('Must start with sk_ or rk_ (test or live).');
      return;
    }
    setStripeError('');
    setStripeSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/settings/stripe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, apiKey: stripeKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStripeError(data.error || 'Failed to save.');
        return;
      }
      setExpandedCard(null);
      fetchConnections();
    } catch {
      setStripeError('Network error.');
    } finally {
      setStripeSaving(false);
    }
  };

  // Save PostHog
  const handlePostHogSave = async () => {
    if (!phKey.trim() || !phProject.trim()) {
      setPhError('API key and Project ID are required.');
      return;
    }
    setPhError('');
    setPhSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/settings/posthog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          apiKey: phKey.trim(),
          projectId: phProject.trim(),
          posthogHost: phHost.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPhError(data.error || 'Failed to save.');
        return;
      }
      setExpandedCard(null);
      fetchConnections();
    } catch {
      setPhError('Network error.');
    } finally {
      setPhSaving(false);
    }
  };

  // Step 3: Trigger sync
  const triggerSync = useCallback(async () => {
    if (!hasAnyConnected) {
      setSkippedAll(true);
      setSyncDone(true);
      return;
    }
    setSyncing(true);
    try {
      await fetch(`${API_URL}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch {
      // continue anyway
    }

    // Poll sync status
    let elapsed = 0;
    pollRef.current = setInterval(async () => {
      elapsed += 3000;
      try {
        const res = await fetch(`${API_URL}/api/sync/status?userId=${encodeURIComponent(userId)}`);
        const json = await res.json();
        if (json.status === 'idle' || json.status === 'complete' || elapsed >= 30000) {
          if (pollRef.current) clearInterval(pollRef.current);
          setSyncing(false);
          setSyncDone(true);
        }
      } catch {
        if (elapsed >= 30000) {
          if (pollRef.current) clearInterval(pollRef.current);
          setSyncing(false);
          setSyncDone(true);
        }
      }
    }, 3000);
  }, [userId, hasAnyConnected]);

  useEffect(() => {
    if (step === 3) triggerSync();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, triggerSync]);

  const goToStep = (next: number) => {
    setStep(next);
    setExpandedCard(null);
  };

  const completedSteps = new Set<number>();
  if (step > 1) completedSteps.add(1);
  if (step > 2) completedSteps.add(2);
  if (syncDone) completedSteps.add(3);

  return (
    <div className="max-w-[540px] mx-auto py-12">
      <StepIndicator currentStep={step} completedSteps={completedSteps} />

      {/* Step 1 */}
      {step === 1 && (
        <div>
          <h2 className="text-[20px] font-semibold text-text-heading text-center mb-2">
            Where do you run ads?
          </h2>
          <p className="text-[13px] text-text-dim text-center mb-8">
            Connect your ad accounts to track spend by campaign and country.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-8">
            <AdPlatformCard
              name="Google Ads"
              logo={<GoogleAdsLogo />}
              connected={!!connections.google_ads?.connected}
              locked={atAdLimit && !connections.google_ads?.connected}
              onClick={() => connectAdPlatform('google_ads')}
            />
            <AdPlatformCard
              name="Meta Ads"
              logo={<MetaLogo />}
              connected={!!connections.meta?.connected}
              locked={atAdLimit && !connections.meta?.connected}
              onClick={() => connectAdPlatform('meta')}
            />
            <AdPlatformCard
              name="TikTok Ads"
              logo={<TikTokLogo />}
              connected={!!connections.tiktok?.connected}
              locked={atAdLimit && !connections.tiktok?.connected}
              onClick={() => connectAdPlatform('tiktok')}
            />
            <AdPlatformCard
              name="LinkedIn Ads"
              logo={<LinkedInLogo />}
              connected={!!connections.linkedin?.connected}
              locked={atAdLimit && !connections.linkedin?.connected}
              onClick={() => connectAdPlatform('linkedin')}
            />
          </div>

          <div className="flex flex-col items-center gap-3">
            {hasAnyAdConnected && (
              <button
                onClick={() => goToStep(2)}
                className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover px-6 py-2.5 rounded-lg text-[13px] font-semibold text-accent-text transition-colors"
              >
                Continue <ArrowRight size={14} />
              </button>
            )}
            <button
              onClick={() => goToStep(2)}
              className="text-[12px] text-text-dim hover:text-text-body transition-colors"
            >
              {hasAnyAdConnected ? '' : "Skip — I don\u2019t run ads yet"}
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div>
          <h2 className="text-[20px] font-semibold text-text-heading text-center mb-2">
            Where does your revenue come from?
          </h2>
          <p className="text-[13px] text-text-dim text-center mb-8">
            Connect Stripe or PostHog so we can match revenue to your ad campaigns.
          </p>

          <div className="space-y-3 mb-8">
            <RevenueCard
              name="Stripe"
              logo={<StripeLogo />}
              connected={!!connections.stripe?.connected}
              expanded={expandedCard === 'stripe'}
              onClick={() => setExpandedCard(expandedCard === 'stripe' ? null : 'stripe')}
            >
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-text-dim block mb-1">Stripe API Key</label>
                  <input
                    type="text"
                    value={stripeKey}
                    onChange={(e) => setStripeKey(e.target.value)}
                    placeholder="rk_live_... or sk_test_..."
                    className="w-full bg-bg-body border border-border-dim rounded-lg px-3 py-2 text-[13px] text-text-heading font-mono placeholder-text-dim/40 focus:outline-none focus:border-accent/40 transition-colors"
                    autoComplete="off"
                  />
                </div>
                {stripeError && <p className="text-[11px] text-error">{stripeError}</p>}
                <button
                  onClick={handleStripeSave}
                  disabled={stripeSaving}
                  className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 px-4 py-2 rounded-lg text-[12px] font-medium text-accent-text transition-colors"
                >
                  {stripeSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  {stripeSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </RevenueCard>

            <RevenueCard
              name="PostHog"
              logo={<PostHogLogo />}
              connected={!!connections.posthog?.connected}
              expanded={expandedCard === 'posthog'}
              onClick={() => setExpandedCard(expandedCard === 'posthog' ? null : 'posthog')}
            >
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-text-dim block mb-1">API Key</label>
                  <input
                    type="text"
                    value={phKey}
                    onChange={(e) => setPhKey(e.target.value)}
                    placeholder="phx_..."
                    className="w-full bg-bg-body border border-border-dim rounded-lg px-3 py-2 text-[13px] text-text-heading font-mono placeholder-text-dim/40 focus:outline-none focus:border-accent/40 transition-colors"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-text-dim block mb-1">Project ID</label>
                  <input
                    type="text"
                    value={phProject}
                    onChange={(e) => setPhProject(e.target.value)}
                    placeholder="12345"
                    className="w-full bg-bg-body border border-border-dim rounded-lg px-3 py-2 text-[13px] text-text-heading font-mono placeholder-text-dim/40 focus:outline-none focus:border-accent/40 transition-colors"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-text-dim block mb-1">Host</label>
                  <input
                    type="text"
                    value={phHost}
                    onChange={(e) => setPhHost(e.target.value)}
                    placeholder="https://us.posthog.com"
                    className="w-full bg-bg-body border border-border-dim rounded-lg px-3 py-2 text-[13px] text-text-heading font-mono placeholder-text-dim/40 focus:outline-none focus:border-accent/40 transition-colors"
                    autoComplete="off"
                  />
                </div>
                <p className="text-[10px] text-text-dim">
                  You can select your purchase event later on the Integrations page.
                </p>
                {phError && <p className="text-[11px] text-error">{phError}</p>}
                <button
                  onClick={handlePostHogSave}
                  disabled={phSaving}
                  className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 px-4 py-2 rounded-lg text-[12px] font-medium text-accent-text transition-colors"
                >
                  {phSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  {phSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </RevenueCard>
          </div>

          <div className="flex flex-col items-center gap-3">
            {hasAnyRevenueConnected && (
              <button
                onClick={() => goToStep(3)}
                className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover px-6 py-2.5 rounded-lg text-[13px] font-semibold text-accent-text transition-colors"
              >
                Continue <ArrowRight size={14} />
              </button>
            )}
            <button
              onClick={() => goToStep(3)}
              className="text-[12px] text-text-dim hover:text-text-body transition-colors"
            >
              {hasAnyRevenueConnected ? '' : 'Skip for now'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="flex flex-col items-center text-center">
          {syncing && (
            <>
              <div className="relative mb-6">
                <div className="absolute inset-0 blur-3xl opacity-20 bg-accent rounded-full scale-150" />
                <Loader2 size={48} className="animate-spin text-accent relative" />
              </div>
              <h2 className="text-[20px] font-semibold text-text-heading mb-2">
                Syncing your data...
              </h2>
              <p className="text-[13px] text-text-dim">
                This usually takes less than 30 seconds.
              </p>
            </>
          )}

          {syncDone && !skippedAll && (
            <>
              <div className="relative mb-6">
                <div className="absolute inset-0 blur-3xl opacity-20 bg-success rounded-full scale-150" />
                <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center relative">
                  <Check size={28} className="text-white" />
                </div>
              </div>
              <h2 className="text-[20px] font-semibold text-text-heading mb-2">
                You&apos;re all set!
              </h2>
              <p className="text-[13px] text-text-dim mb-8">
                Your data is ready. Explore your profit dashboard.
              </p>
              <button
                onClick={onComplete}
                className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover px-6 py-2.5 rounded-lg text-[13px] font-semibold text-accent-text transition-colors"
              >
                Go to dashboard <ArrowRight size={14} />
              </button>
            </>
          )}

          {syncDone && skippedAll && (
            <>
              <div className="relative mb-6">
                <div className="absolute inset-0 blur-3xl opacity-20 bg-accent rounded-full scale-150" />
                <svg width="64" height="64" viewBox="0 0 40 40" fill="none" aria-hidden="true" className="relative">
                  <rect x="2" y="24" width="7" height="14" rx="1.5" fill="var(--accent)" opacity="0.35" />
                  <rect x="12" y="16" width="7" height="22" rx="1.5" fill="var(--accent)" opacity="0.6" />
                  <rect x="22" y="8" width="7" height="30" rx="1.5" fill="var(--accent)" opacity="0.85" />
                  <rect x="32" y="2" width="7" height="36" rx="1.5" fill="var(--accent)" />
                </svg>
              </div>
              <h2 className="text-[20px] font-semibold text-text-heading mb-2">
                No platforms connected yet
              </h2>
              <p className="text-[13px] text-text-dim mb-8">
                You can connect your platforms anytime from the Integrations page.
              </p>
              <button
                onClick={onComplete}
                className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover px-6 py-2.5 rounded-lg text-[13px] font-semibold text-accent-text transition-colors"
              >
                Go to dashboard <ArrowRight size={14} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
