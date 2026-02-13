'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface SubscriptionLimits {
  maxAdPlatforms: number;
  syncIntervalHours: number;
  dataRetentionDays: number;
  campaignPL: boolean;
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
  limits: { maxAdPlatforms: 1, syncIntervalHours: 24, dataRetentionDays: 30, campaignPL: false },
  trialEnd: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subscription: null,
  loading: true,
  refetch: () => {},
});

export function useSubscription() {
  return useContext(SubscriptionContext);
}

export default function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user?.id) return;
    try {
      const params = new URLSearchParams({ userId: user.id });
      const res = await fetch(`${API_URL}/api/billing/subscription?${params}`);
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
