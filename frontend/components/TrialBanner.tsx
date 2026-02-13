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
    <div className="bg-accent/10 border-b border-accent/15 px-4 py-2 flex items-center justify-center gap-2 text-[12px]">
      <span className="text-text-body">
        You have <span className="font-semibold text-text-heading">{daysLeft} day{daysLeft !== 1 ? 's' : ''}</span> left in your free trial
        {' '}&mdash;{' '}
        <Link
          href="/pricing"
          className="text-accent hover:text-accent-hover font-semibold underline underline-offset-2 transition-colors"
        >
          Pick a plan for $0
        </Link>
        {' '}to keep your profit tracking running without interruption
      </span>
    </div>
  );
}
