'use client';

import { Suspense, useState, useCallback, useEffect } from 'react';
import { useUser, SignInButton } from '@clerk/nextjs';
import { usePathname, useSearchParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import TopBar from '../../components/TopBar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/integrations': 'Integrations',
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

function SyncIndicator({ userId }: { userId: string }) {
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

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
    setSyncing(true);
    try {
      await fetch(`${API_URL}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      setTimeout(() => {
        fetchSyncStatus();
        setSyncing(false);
      }, 5000);
    } catch {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus]);

  return (
    <div className="flex items-center gap-2">
      {lastSynced && (
        <span className="text-text-dim text-[12px]">
          Last synced {timeAgo(lastSynced)}
        </span>
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

          /* Slightly narrower attribution cards to fit 3 across */
          .embed-mode .w-\\[220px\\] {
            width: 190px;
          }
        `}</style>
        <main className="p-4">{children}</main>
      </div>
    );
  }

  const pageTitle = PAGE_TITLES[pathname] || 'MetricHQ';
  const syncSlot = !isDemo && pathname === '/dashboard' && user?.id ? (
    <SyncIndicator userId={user.id} />
  ) : undefined;

  return (
    <div className="min-h-screen bg-bg-body">
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <div className="md:ml-52 flex flex-col min-h-screen">
        <TopBar title={pageTitle} syncSlot={syncSlot} onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
