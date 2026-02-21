'use client';

import { createContext, useContext, useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import { useUser } from '@clerk/nextjs';
import { apiFetch } from '@/lib/api';

interface SubscriptionLimits {
  maxAdPlatforms: number;
  syncIntervalHours: number;
  dataRetentionDays: number;
  campaignPL: boolean;
  extraPages: boolean;
  teamAccess: boolean;
  apiAccess: boolean;
}

export interface Subscription {
  plan: string | null;
  status: string;
  isActive: boolean;
  limits: SubscriptionLimits;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface SubscriptionContextValue {
  subscription: Subscription | null;
  loading: boolean;
  refetch: () => void;
}

const defaultSub: Subscription = {
  plan: null,
  status: 'none',
  isActive: false,
  limits: { maxAdPlatforms: 1, syncIntervalHours: 4, dataRetentionDays: 180, campaignPL: true, extraPages: false, teamAccess: false, apiAccess: false },
  trialEnd: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subscription: null,
  loading: true,
  refetch: () => {},
});

const DEVMODE_KEY = 'mhq_devmode';

function subscribeToStorage(cb: () => void) {
  window.addEventListener('storage', cb);
  // Also listen for custom event for same-tab updates
  window.addEventListener('mhq-devmode-change', cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener('mhq-devmode-change', cb);
  };
}

function getDevmodeSnapshot(): boolean {
  try { return localStorage.getItem(DEVMODE_KEY) === 'true'; } catch { return false; }
}

function getDevmodeServerSnapshot(): boolean {
  return false;
}

export function useDevmode() {
  return useSyncExternalStore(subscribeToStorage, getDevmodeSnapshot, getDevmodeServerSnapshot);
}

export function setDevmode(enabled: boolean) {
  try {
    if (enabled) localStorage.setItem(DEVMODE_KEY, 'true');
    else localStorage.removeItem(DEVMODE_KEY);
    window.dispatchEvent(new Event('mhq-devmode-change'));
  } catch { /* ignore */ }
}

const devmodeSub: Subscription = {
  plan: 'pro',
  status: 'active',
  isActive: true,
  limits: { maxAdPlatforms: Infinity, syncIntervalHours: 4, dataRetentionDays: Infinity, campaignPL: true, extraPages: true, teamAccess: true, apiAccess: true },
  trialEnd: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  const devmode = useDevmode();
  if (devmode) {
    return { subscription: devmodeSub, loading: false, refetch: ctx.refetch };
  }
  return ctx;
}

export default function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user?.id) return;
    try {
      const params = new URLSearchParams({ userId: user.id });
      const res = await apiFetch(`/api/billing/subscription?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      } else {
        setSubscription(defaultSub);
      }
    } catch {
      setSubscription(defaultSub);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return (
    <SubscriptionContext.Provider value={{ subscription, loading, refetch: fetchSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
}
