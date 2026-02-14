'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { Check } from 'lucide-react';
import ThemeSwitcher from '../../../components/ThemeSwitcher';
import CurrencySelect from '../../../components/CurrencySelect';
import { useCurrency } from '../../../lib/currency';
import { useSubscription } from '../../../components/SubscriptionProvider';
import TeamSection from '../../../components/TeamSection';
import ApiKeysSection from '../../../components/ApiKeysSection';

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

function LimitRow({ label, included, hint }: { label: string; included: boolean; hint?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-t border-border-dim">
      <span className="text-[12px] text-text-dim">{label}</span>
      {included ? (
        <span className="text-[12px] text-success flex items-center gap-1">
          <Check size={12} /> Included
        </span>
      ) : (
        <span className="text-[12px] text-text-dim">
          {hint}{' '}
          <Link href="/pricing" className="text-accent hover:text-accent-hover">Upgrade</Link>
        </span>
      )}
    </div>
  );
}

function PlanLimitsSummary({ limits, plan }: { limits: { maxAdPlatforms: number; syncIntervalHours: number; dataRetentionDays: number; teamAccess: boolean; apiAccess: boolean }; plan: string | null }) {
  const isStarter = plan === 'starter';
  const isGrowth = plan === 'growth';
  const allPlatforms = limits.maxAdPlatforms > 1 || limits.maxAdPlatforms === Infinity || !isFinite(limits.maxAdPlatforms);
  const fastSync = limits.syncIntervalHours <= 4;
  const unlimitedHistory = limits.dataRetentionDays >= 9999 || !isFinite(limits.dataRetentionDays);
  const yearHistory = limits.dataRetentionDays >= 365;

  return (
    <div className="pt-3 border-t border-border-dim mt-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-text-dim mb-1">Your plan includes</p>
      <div className="flex items-center justify-between py-2">
        <span className="text-[12px] text-text-dim">Ad platforms</span>
        {allPlatforms ? (
          <span className="text-[12px] text-success flex items-center gap-1"><Check size={12} /> All platforms</span>
        ) : (
          <span className="text-[12px] text-text-dim">
            {limits.maxAdPlatforms} platform{' · '}
            <Link href="/pricing" className="text-accent hover:text-accent-hover">Upgrade for all</Link>
          </span>
        )}
      </div>
      <div className="flex items-center justify-between py-2 border-t border-border-dim">
        <span className="text-[12px] text-text-dim">Sync frequency</span>
        {fastSync ? (
          <span className="text-[12px] text-success flex items-center gap-1"><Check size={12} /> Every 4h</span>
        ) : (
          <span className="text-[12px] text-text-dim">
            Every {limits.syncIntervalHours}h{' · '}
            <Link href="/pricing" className="text-accent hover:text-accent-hover">Upgrade for 4h</Link>
          </span>
        )}
      </div>
      <div className="flex items-center justify-between py-2 border-t border-border-dim">
        <span className="text-[12px] text-text-dim">Data history</span>
        {unlimitedHistory ? (
          <span className="text-[12px] text-success flex items-center gap-1"><Check size={12} /> Unlimited</span>
        ) : yearHistory ? (
          <span className="text-[12px] text-text-dim">
            1 year{' · '}
            <Link href="/pricing" className="text-accent hover:text-accent-hover">Upgrade for unlimited</Link>
          </span>
        ) : (
          <span className="text-[12px] text-text-dim">
            {Math.round(limits.dataRetentionDays / 30)} months{' · '}
            <Link href="/pricing" className="text-accent hover:text-accent-hover">Upgrade for more</Link>
          </span>
        )}
      </div>
      <LimitRow label="Team access" included={limits.teamAccess} hint="Pro only ·" />
      <LimitRow label="API access" included={limits.apiAccess} hint="Pro only ·" />
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useUser();
  const { currency, setCurrency } = useCurrency();
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

            {/* Plan limits summary */}
            {subscription?.isActive && (
              <PlanLimitsSummary
                limits={subscription.limits}
                plan={subscription.plan}
              />
            )}
          </div>
        )}
      </div>

      <TeamSection />
      <ApiKeysSection />

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

      {/* Currency — low priority, near the bottom */}
      <div className="bg-bg-surface rounded-xl border border-border-dim p-5">
        <h2 className="text-[14px] font-medium text-text-heading mb-4">Currency</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] text-text-body">Display currency</p>
            <p className="text-[11px] text-text-dim mt-0.5">All dashboard values will be converted</p>
          </div>
          <CurrencySelect value={currency} onChange={setCurrency} />
        </div>
      </div>
    </div>
  );
}
