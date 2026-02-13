'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import ThemeSwitcher from '../../../components/ThemeSwitcher';
import { useSubscription } from '../../../components/SubscriptionProvider';

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  trialing: { label: 'Trial', color: 'text-accent' },
  active: { label: 'Active', color: 'text-success' },
  past_due: { label: 'Past due', color: 'text-error' },
  cancelled: { label: 'Cancelled', color: 'text-error' },
  expired: { label: 'Expired', color: 'text-error' },
  none: { label: 'No subscription', color: 'text-text-dim' },
};

export default function SettingsPage() {
  const { user } = useUser();
  const { subscription, loading } = useSubscription();
  const status = subscription?.status || 'none';
  const statusInfo = STATUS_LABELS[status] || STATUS_LABELS.none;

  return (
    <div className="max-w-3xl space-y-5">
      <div className="bg-bg-surface rounded-xl border border-border-dim p-5">
        <h2 className="text-[14px] font-medium text-text-heading mb-4">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] text-text-body">Theme</p>
            <p className="text-[11px] text-text-dim mt-0.5">Choose light or dark mode</p>
          </div>
          <ThemeSwitcher />
        </div>
      </div>

      {/* Subscription */}
      <div className="bg-bg-surface rounded-xl border border-border-dim p-5">
        <h2 className="text-[14px] font-medium text-text-heading mb-4">Subscription</h2>
        {loading ? (
          <div className="h-12 bg-bg-elevated animate-pulse rounded-lg" />
        ) : (
          <div className="space-y-0">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[12px] text-text-dim">Plan</span>
              <span className="text-[12px] text-text-heading capitalize flex items-center gap-1.5">
                {subscription?.plan || 'None'}
                {status === 'trialing' && (
                  <span className="text-[10px] font-medium bg-accent/15 text-accent px-1.5 py-0.5 rounded-full">
                    trial
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5 border-t border-border-dim">
              <span className="text-[12px] text-text-dim">Status</span>
              <span className={`text-[12px] font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            {subscription?.trialEnd && status === 'trialing' && (
              <div className="flex items-center justify-between py-2.5 border-t border-border-dim">
                <span className="text-[12px] text-text-dim">Trial ends</span>
                <span className="text-[12px] text-text-heading">
                  {formatDate(subscription.trialEnd)}
                </span>
              </div>
            )}
            {subscription?.currentPeriodEnd && subscription.isActive && status === 'active' && (
              <div className="flex items-center justify-between py-2.5 border-t border-border-dim">
                <span className="text-[12px] text-text-dim">Renews</span>
                <span className="text-[12px] text-text-heading">
                  {formatDate(subscription.currentPeriodEnd)}
                  {subscription.cancelAtPeriodEnd && (
                    <span className="text-error ml-1">(cancels)</span>
                  )}
                </span>
              </div>
            )}
            <div className="pt-3 border-t border-border-dim mt-2.5 flex gap-3">
              <Link
                href="/pricing"
                className="text-[12px] text-accent hover:text-accent-hover font-medium transition-colors"
              >
                {subscription?.isActive ? 'Change plan' : 'View plans'}
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="bg-bg-surface rounded-xl border border-border-dim p-5">
        <h2 className="text-[14px] font-medium text-text-heading mb-4">Account</h2>
        <div className="space-y-0">
          <div className="flex items-center justify-between py-2.5">
            <span className="text-[12px] text-text-dim">Email</span>
            <span className="text-[12px] text-text-heading">
              {user?.primaryEmailAddress?.emailAddress || '-'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5 border-t border-border-dim">
            <span className="text-[12px] text-text-dim">Name</span>
            <span className="text-[12px] text-text-heading">
              {user?.fullName || '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
