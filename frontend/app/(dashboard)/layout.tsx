'use client';

import { Suspense, useState, useCallback, useEffect } from 'react';
import { useUser, SignInButton } from '@clerk/nextjs';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import TopBar from '../../components/TopBar';
import SubscriptionProvider, { useSubscription } from '../../components/SubscriptionProvider';
import TrialBanner from '../../components/TrialBanner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/events': 'Event Tracker',
  '/events/data': 'Event Tracker',
  '/integrations': 'Integrations',
  '/custom-costs': 'Custom Costs',
  '/pricing': 'Pricing',
  '/settings': 'Settings',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatNextSync(lastSynced: string, intervalHours: number): string {
  const nextSync = new Date(new Date(lastSynced).getTime() + intervalHours * 60 * 60 * 1000);
  if (nextSync.getTime() <= Date.now()) return 'due now';
  return `~${nextSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function SyncIndicator({ userId, syncIntervalHours }: { userId: string; syncIntervalHours?: number }) {
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [cooldownError, setCooldownError] = useState<string | null>(null);

  const fetchSyncStatus = useCallback(async () => {
    try {
      const params = new URLSearchParams({ userId });
      const res = await fetch(`${API_URL}/api/sync/status?${params}`);
      if (res.ok) {
        const json = await res.json();
        setLastSynced(json.lastSynced);
        setSyncing(json.isSyncing);
      }
    } catch {
      // Silently ignore
    }
  }, [userId]);

  const handleRefresh = async () => {
    if (syncing) return;
    setCooldownError(null);
    setSyncing(true);
    try {
      const res = await fetch(`${API_URL}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.status === 429) {
        const data = await res.json();
        const next = data.nextSyncAt ? new Date(data.nextSyncAt) : null;
        const label = next ? `Next sync available ${timeAgo(next.toISOString()).replace(' ago', '')} from now` : 'Try again later';
        setCooldownError(label);
        setSyncing(false);
        return;
      }
      if (!res.ok) {
        setSyncing(false);
        return;
      }
      // Poll until sync finishes (check every 3s, give up after 2 min)
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await fetch(`${API_URL}/api/sync/status?${new URLSearchParams({ userId })}`);
          if (statusRes.ok) {
            const json = await statusRes.json();
            setLastSynced(json.lastSynced);
            if (!json.isSyncing || attempts >= 40) {
              clearInterval(poll);
              setSyncing(false);
            }
          }
        } catch {
          clearInterval(poll);
          setSyncing(false);
        }
      }, 3000);
    } catch {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus]);

  const showNextSync = syncIntervalHours && syncIntervalHours > 4 && lastSynced;

  return (
    <div className="flex items-center gap-2">
      {lastSynced && (
        <span className="text-text-dim text-[12px]">
          Last synced {timeAgo(lastSynced)}
          {showNextSync ? (
            <span className="text-text-dim/80"> · Next sync {formatNextSync(lastSynced, syncIntervalHours)}</span>
          ) : syncIntervalHours && isFinite(syncIntervalHours) ? (
            <span className="text-text-dim/80"> · syncs every {syncIntervalHours}h</span>
          ) : null}
        </span>
      )}
      {cooldownError && (
        <span className="text-[11px] text-warning">{cooldownError}</span>
      )}
      <button
        onClick={handleRefresh}
        disabled={syncing}
        className="p-1.5 rounded-md hover:bg-bg-hover text-text-dim hover:text-text-heading transition-colors disabled:opacity-50"
        title="Refresh data"
      >
        <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
      </button>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-body flex items-center justify-center"><div className="text-text-dim text-[13px]">Loading...</div></div>}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isSignedIn, isLoaded } = useUser();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  const isEmbed = searchParams.get('embed') === 'true';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isDemo && !isLoaded) {
    return (
      <div className="min-h-screen bg-bg-body flex items-center justify-center">
        <div className="text-text-dim text-[13px]">Loading...</div>
      </div>
    );
  }

  if (!isDemo && !isSignedIn) {
    return (
      <div className="min-h-screen bg-bg-body flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="2" y="24" width="7" height="14" rx="1.5" fill="var(--accent)" opacity="0.35" />
              <rect x="12" y="16" width="7" height="22" rx="1.5" fill="var(--accent)" opacity="0.6" />
              <rect x="22" y="8" width="7" height="30" rx="1.5" fill="var(--accent)" opacity="0.85" />
              <rect x="32" y="2" width="7" height="36" rx="1.5" fill="var(--accent)" />
            </svg>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-text-heading">Metric</span><span className="text-accent">HQ</span>
            </h1>
          </div>
          <p className="text-text-dim text-[13px] mb-8">Sign in to access your dashboard</p>
          <SignInButton mode="modal">
            <button className="bg-accent hover:bg-accent-hover px-8 py-3 rounded-lg text-[13px] font-semibold text-accent-text transition-colors">
              Sign In
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  if (isEmbed) {
    return (
      <div className="min-h-screen bg-bg-body embed-mode">
        <style>{`
          /* Embed-only overrides — scoped via .embed-mode */

          /* Scale down only the calendar dropdown, not the trigger button */
          .embed-mode .absolute.shadow-2xl {
            transform: scale(0.85);
            transform-origin: top right;
          }

          /* 2-col country/campaign split at lower breakpoint */
          @media (min-width: 700px) {
            .embed-mode .xl\\:grid-cols-2 {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          /* Hide "Connect platform" card in embed */
          .embed-mode a[href="/integrations"] {
            display: none;
          }
        `}</style>
        <main className="px-8 py-4">{children}</main>
      </div>
    );
  }

  const pageTitle = PAGE_TITLES[pathname] || 'MetricHQ';

  return (
    <SubscriptionProvider>
      <DashboardContent
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        pageTitle={pageTitle}
        pathname={pathname}
        userId={!isDemo ? user?.id : undefined}
      >
        {children}
      </DashboardContent>
    </SubscriptionProvider>
  );
}

function DashboardContent({
  sidebarOpen,
  setSidebarOpen,
  pageTitle,
  pathname,
  userId,
  children,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  pageTitle: string;
  pathname: string;
  userId?: string;
  children: React.ReactNode;
}) {
  const { subscription, loading } = useSubscription();
  const isExpired = !loading && subscription && ['expired', 'none', 'cancelled'].includes(subscription.status);
  // Allow pricing and invite pages even if expired
  const showPaywall = isExpired && pathname !== '/pricing' && pathname !== '/invite';

  const syncSlot = pathname === '/dashboard' && userId ? (
    <SyncIndicator userId={userId} syncIntervalHours={subscription?.limits?.syncIntervalHours} />
  ) : undefined;

  return (
    <div className="min-h-screen bg-bg-body">
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <div className="md:ml-52 flex flex-col min-h-screen">
        <TopBar title={pageTitle} syncSlot={syncSlot} onMenuToggle={() => setSidebarOpen(true)} />
        <TrialBanner />
        {showPaywall ? (
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <div className="flex items-center justify-center gap-2.5 mb-4">
                <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <rect x="2" y="24" width="7" height="14" rx="1.5" fill="var(--accent)" opacity="0.35" />
                  <rect x="12" y="16" width="7" height="22" rx="1.5" fill="var(--accent)" opacity="0.6" />
                  <rect x="22" y="8" width="7" height="30" rx="1.5" fill="var(--accent)" opacity="0.85" />
                  <rect x="32" y="2" width="7" height="36" rx="1.5" fill="var(--accent)" />
                </svg>
                <h1 className="text-2xl font-bold tracking-tight">
                  <span className="text-text-heading">Metric</span><span className="text-accent">HQ</span>
                </h1>
              </div>
              <h2 className="text-[18px] font-semibold text-text-heading mb-2">Your trial has ended</h2>
              <p className="text-[13px] text-text-dim mb-8">
                Your data is still here. Upgrade to access your dashboard.
              </p>
              <Link
                href="/pricing"
                className="inline-block bg-accent hover:bg-accent-hover text-accent-text px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                View plans
              </Link>
            </div>
          </main>
        ) : (
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        )}
      </div>
    </div>
  );
}
