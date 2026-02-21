'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Check, Loader2, ExternalLink, AlertTriangle, X } from 'lucide-react';
import { useSubscription } from '../../../components/SubscriptionProvider';
import { PLANS } from '../../../lib/plans';
import { apiFetch } from '@/lib/api';


const PLAN_ORDER = ['starter', 'growth', 'pro'];

interface DowngradeImpact {
  excessPlatforms?: string[];
  teamMembersCount?: number;
  apiKeysCount?: number;
  loseExtraPages?: boolean;
  retentionChange?: { from: string; to: string };
  isDowngrade: boolean;
}

function RollingDigit({ digit, delay = 0 }: { digit: string; delay?: number }) {
  const isNum = /\d/.test(digit);
  if (!isNum) return <span>{digit}</span>;
  return (
    <span className="inline-block relative overflow-hidden" style={{ width: '0.6em', height: '1em' }}>
      <span
        key={digit}
        className="absolute inset-0 flex items-center justify-center animate-roll-in"
        style={{ animationDelay: `${delay}ms` }}
      >
        {digit}
      </span>
    </span>
  );
}

function RollingPrice({ value }: { value: number }) {
  const chars = String(value).split('');
  return (
    <span className="inline-flex text-4xl font-bold text-text-heading">
      $
      {chars.map((ch, i) => (
        <RollingDigit key={`${i}-${ch}`} digit={ch} delay={i * 60} />
      ))}
    </span>
  );
}

function DowngradeModal({
  impact,
  targetPlanName,
  onConfirm,
  onCancel,
  loading,
}: {
  impact: DowngradeImpact;
  targetPlanName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl mx-4">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-warning" />
              <h3 className="text-[15px] font-semibold text-text-heading">
                Switching to {targetPlanName}
              </h3>
            </div>
            <button onClick={onCancel} className="p-1 rounded hover:bg-bg-elevated transition-colors">
              <X size={16} className="text-text-dim" />
            </button>
          </div>

          <p className="text-[13px] text-text-body mb-4">
            The following changes will take effect:
          </p>

          <ul className="space-y-2.5 mb-5">
            {impact.excessPlatforms && impact.excessPlatforms.length > 0 && (
              <li className="flex items-start gap-2 text-[13px] text-text-body">
                <span className="text-warning mt-0.5 shrink-0">&#8226;</span>
                Pausing sync for <strong>{impact.excessPlatforms.join(' and ')}</strong>
                <span className="text-text-dim text-[11px]">(data preserved)</span>
              </li>
            )}
            {impact.teamMembersCount && (
              <li className="flex items-start gap-2 text-[13px] text-text-body">
                <span className="text-warning mt-0.5 shrink-0">&#8226;</span>
                Pausing team access for {impact.teamMembersCount} member{impact.teamMembersCount > 1 ? 's' : ''}
                <span className="text-text-dim text-[11px]">(invites preserved)</span>
              </li>
            )}
            {impact.apiKeysCount && (
              <li className="flex items-start gap-2 text-[13px] text-text-body">
                <span className="text-warning mt-0.5 shrink-0">&#8226;</span>
                Suspending {impact.apiKeysCount} API key{impact.apiKeysCount > 1 ? 's' : ''}
                <span className="text-text-dim text-[11px]">(keys preserved)</span>
              </li>
            )}
            {impact.loseExtraPages && (
              <li className="flex items-start gap-2 text-[13px] text-text-body">
                <span className="text-warning mt-0.5 shrink-0">&#8226;</span>
                Losing access to Cohorts, Events & Custom Costs pages
              </li>
            )}
            {impact.retentionChange && (
              <li className="flex items-start gap-2 text-[13px] text-text-body">
                <span className="text-warning mt-0.5 shrink-0">&#8226;</span>
                Limiting data history to {impact.retentionChange.to}
                <span className="text-text-dim text-[11px]">(older data preserved)</span>
              </li>
            )}
          </ul>

          <p className="text-[11px] text-text-dim mb-5">
            Nothing is deleted. Upgrade anytime to restore everything instantly.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-bg-elevated hover:bg-bg-hover text-text-heading border border-border-dim transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-hover text-accent-text transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Continue to checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const { user } = useUser();
  const { subscription, loading: subLoading } = useSubscription();
  const [yearly, setYearly] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [downgradeModal, setDowngradeModal] = useState<{
    impact: DowngradeImpact;
    priceId: string;
    planName: string;
  } | null>(null);
  const [impactLoading, setImpactLoading] = useState<string | null>(null);

  const handleCheckout = async (priceId: string | undefined) => {
    if (!priceId || !user?.id) return;
    setCheckoutLoading(priceId);
    try {
      const res = await apiFetch(`/api/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // silently fail
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePlanClick = async (priceId: string | undefined, planKey: string, planName: string) => {
    if (!priceId || !user?.id) return;

    const isActive = subscription?.status === 'active';
    const currentPlan = subscription?.plan?.toLowerCase();

    // Check if this is a downgrade
    if (isActive && currentPlan) {
      const currentIdx = PLAN_ORDER.indexOf(currentPlan);
      const targetIdx = PLAN_ORDER.indexOf(planKey);

      if (targetIdx < currentIdx) {
        // It's a downgrade — fetch impact first
        setImpactLoading(priceId);
        try {
          const params = new URLSearchParams({ userId: user.id, targetPlan: planKey });
          const res = await apiFetch(`/api/billing/downgrade-impact?${params}`);
          const impact: DowngradeImpact = await res.json();

          if (impact.isDowngrade) {
            setDowngradeModal({ impact, priceId, planName });
            setImpactLoading(null);
            return;
          }
        } catch {
          // If impact check fails, proceed to checkout anyway
        } finally {
          setImpactLoading(null);
        }
      }
    }

    handleCheckout(priceId);
  };

  const handlePortal = async () => {
    if (!user?.id) return;
    setPortalLoading(true);
    try {
      const res = await apiFetch(`/api/billing/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // silently fail
    } finally {
      setPortalLoading(false);
    }
  };

  const isActive = subscription?.status === 'active';
  const showTrialPricing = !isActive;
  const currentPlan = subscription?.plan?.toLowerCase();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text-heading mb-2">
          {isActive ? 'Manage your plan' : 'Choose your plan'}
        </h1>
        <p className="text-text-dim text-[13px]">
          Simple, transparent pricing. No hidden fees.
        </p>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <span className={`text-sm ${!yearly ? 'text-text-heading font-medium' : 'text-text-dim'}`}>Monthly</span>
        <button
          onClick={() => setYearly(y => !y)}
          className="relative w-12 h-6 rounded-full bg-bg-elevated border border-border-dim transition-colors"
        >
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-accent transition-transform ${yearly ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
        <span className={`text-sm ${yearly ? 'text-text-heading font-medium' : 'text-text-dim'}`}>
          Yearly <span className="text-success text-[12px] font-medium">Save 25%</span>
        </span>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map(plan => {
          const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
          const priceId = yearly ? plan.yearlyPriceId : plan.monthlyPriceId;
          const planKey = plan.name.toLowerCase();
          const isCurrent = currentPlan === planKey && isActive;
          const isLoading = checkoutLoading === priceId || impactLoading === priceId;

          return (
            <div
              key={plan.name}
              className={`rounded-xl border p-6 relative flex flex-col ${
                plan.popular
                  ? 'border-accent bg-accent-muted'
                  : 'border-border-dim bg-bg-surface'
              }`}
            >
              {isCurrent && (
                <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider bg-success/20 text-success px-2 py-0.5 rounded-full">
                  Current plan
                </span>
              )}

              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-text-heading">{plan.name}</h3>
                {plan.popular && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-accent text-accent-text px-2 py-0.5 rounded-full">
                    Popular
                  </span>
                )}
              </div>
              <p className="text-text-dim text-sm mb-4">{plan.description}</p>

              <div className="mb-6">
                {showTrialPricing ? (
                  <>
                    <span className="text-4xl font-bold text-text-heading">$0</span>
                    <p className="text-[13px] text-text-dim mt-1">
                      then ${price}/mo in 14 days
                    </p>
                  </>
                ) : (
                  <>
                    <RollingPrice value={price} />
                    <span className="text-text-dim text-sm">/mo</span>
                    {yearly && (
                      <span className="text-text-dim text-[12px] ml-2">billed yearly</span>
                    )}
                  </>
                )}
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-text-body">
                    <Check size={16} className="text-success mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                {isCurrent ? (
                  <button
                    onClick={handlePortal}
                    disabled={portalLoading}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold bg-bg-elevated hover:bg-bg-hover text-text-heading border border-border-dim transition-colors flex items-center justify-center gap-2"
                  >
                    {portalLoading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                    Manage subscription
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handlePlanClick(priceId, planKey, plan.name)}
                      disabled={isLoading || !priceId || subLoading}
                      className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                        plan.popular
                          ? 'bg-accent hover:bg-accent-hover text-accent-text'
                          : 'bg-bg-elevated hover:bg-bg-hover text-text-heading border border-border-dim'
                      }`}
                    >
                      {isLoading && <Loader2 size={14} className="animate-spin" />}
                      {isActive ? 'Switch to this plan' : `Pick ${plan.name} plan`}
                    </button>
                    {showTrialPricing && (
                      <p className="text-[11px] text-text-dim text-center mt-2">
                        No charge until your free trial ends in 14 days
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manage billing link for active subscribers */}
      {isActive && (
        <div className="text-center mt-8">
          <button
            onClick={handlePortal}
            disabled={portalLoading}
            className="text-accent hover:text-accent-hover text-sm font-medium transition-colors inline-flex items-center gap-1.5"
          >
            <ExternalLink size={14} />
            {portalLoading ? 'Opening...' : 'Manage billing & invoices'}
          </button>
        </div>
      )}

      {/* Downgrade Warning Modal */}
      {downgradeModal && (
        <DowngradeModal
          impact={downgradeModal.impact}
          targetPlanName={downgradeModal.planName}
          loading={!!checkoutLoading}
          onConfirm={() => {
            handleCheckout(downgradeModal.priceId);
            setDowngradeModal(null);
          }}
          onCancel={() => setDowngradeModal(null)}
        />
      )}
    </div>
  );
}
