'use client';

import Link from 'next/link';
import { Clock, AlertTriangle } from 'lucide-react';
import { useSubscription } from './SubscriptionProvider';

export default function TrialBanner() {
  const { subscription, loading } = useSubscription();

  if (loading || !subscription) return null;

  if (subscription.status === 'past_due') {
    return (
      <div className="bg-error/10 border-b border-error/20 px-4 py-2 flex items-center justify-center gap-2 text-[12px]">
        <AlertTriangle size={13} className="text-error shrink-0" />
        <span className="text-error">
          Payment failed. Please update your billing info.
        </span>
        <Link
          href="/settings"
          className="text-error hover:text-error/80 font-medium transition-colors ml-1 underline underline-offset-2"
        >
          Update billing
        </Link>
      </div>
    );
  }

  if (subscription.status !== 'trialing' || !subscription.trialEnd) {
    return null;
  }

  const daysLeft = Math.max(0, Math.ceil(
    (new Date(subscription.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ));

  return (
    <Link
      href="/pricing"
      className="bg-accent-muted border-b border-border-dim px-4 py-2 flex items-center justify-center gap-2 text-[12px] hover:bg-accent/15 transition-colors cursor-pointer"
    >
      <Clock size={13} className="text-accent shrink-0" />
      <span className="text-text-body">
        You have {daysLeft} day{daysLeft !== 1 ? 's' : ''} left in your free trial &mdash;{' '}
        <span className="text-accent font-semibold">Choose a plan for $0</span>
        {' '}to keep your dashboard running without interruption
      </span>
    </Link>
  );
}
