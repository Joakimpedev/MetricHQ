'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Check, Loader2, ExternalLink } from 'lucide-react';
import { useSubscription } from '../../../components/SubscriptionProvider';
import { PLANS } from '../../../lib/plans';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function PricingPage() {
  const { user } = useUser();
  const { subscription, loading: subLoading } = useSubscription();
  const [yearly, setYearly] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleCheckout = async (priceId: string | undefined) => {
    if (!priceId || !user?.id) return;
    setCheckoutLoading(priceId);
    try {
      const res = await fetch(`${API_URL}/api/billing/checkout`, {
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

  const handlePortal = async () => {
    if (!user?.id) return;
    setPortalLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/billing/portal`, {
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
  const isTrial = subscription?.status === 'trialing' || subscription?.status === 'trial';
  const showTrialPricing = !isActive;
  const currentPlan = subscription?.plan?.toLowerCase();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-text-heading mb-1">
          {isActive ? 'Manage your plan' : 'Billing'}
        </h1>
      </div>

      {/* Monthly / Yearly toggle */}
      <div className="flex items-center justify-end gap-3 mb-6">
        <button
          onClick={() => setYearly(false)}
          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
            !yearly ? 'bg-bg-elevated text-text-heading' : 'text-text-dim hover:text-text-body'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setYearly(true)}
          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
            yearly ? 'bg-bg-elevated text-text-heading' : 'text-text-dim hover:text-text-body'
          }`}
        >
          Yearly
        </button>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {PLANS.map(plan => {
          const monthlyPrice = plan.monthlyPrice;
          const yearlyMonthly = plan.yearlyPrice;
          const price = yearly ? yearlyMonthly : monthlyPrice;
          const priceId = yearly ? plan.yearlyPriceId : plan.monthlyPriceId;
          const planKey = plan.name.toLowerCase();
          const isCurrent = currentPlan === planKey && isActive;
          const isLoading = checkoutLoading === priceId;

          return (
            <div
              key={plan.name}
              className={`rounded-xl border p-5 flex flex-col ${
                plan.popular
                  ? 'border-accent/40 bg-bg-surface'
                  : 'border-border-dim bg-bg-surface'
              }`}
            >
              {isCurrent && (
                <span className="self-end text-[10px] font-semibold uppercase tracking-wider bg-success/20 text-success px-2 py-0.5 rounded-full mb-2">
                  Current
                </span>
              )}

              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim mb-3">
                {plan.name}
              </p>

              {/* Price */}
              <div className="mb-5">
                {showTrialPricing ? (
                  <>
                    <span className="text-4xl font-bold text-text-heading">$0</span>
                    <p className="text-[13px] text-text-dim mt-1">
                      then ${price}/mo in 14 days
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-bold text-text-heading">${price}</span>
                    <span className="text-text-dim text-sm">/mo</span>
                    {yearly && (
                      <p className="text-[12px] text-text-dim mt-1">billed yearly</p>
                    )}
                  </>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-text-body">
                    <Check size={14} className="text-success mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Button */}
              <div className="mt-auto">
                {isCurrent ? (
                  <button
                    onClick={handlePortal}
                    disabled={portalLoading}
                    className="w-full py-2.5 rounded-lg text-[13px] font-semibold bg-bg-elevated hover:bg-bg-hover text-text-heading border border-border-dim transition-colors flex items-center justify-center gap-2"
                  >
                    {portalLoading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                    Manage subscription
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleCheckout(priceId)}
                      disabled={isLoading || !priceId || subLoading}
                      className={`w-full py-2.5 rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                        plan.popular
                          ? 'bg-accent hover:bg-accent-hover text-accent-text'
                          : 'bg-bg-elevated hover:bg-bg-hover text-text-heading border border-border-dim'
                      }`}
                    >
                      {isLoading && <Loader2 size={14} className="animate-spin" />}
                      {isActive ? `Switch to ${plan.name}` : `Pick ${plan.name} plan`}
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
            className="text-accent hover:text-accent-hover text-[13px] font-medium transition-colors inline-flex items-center gap-1.5"
          >
            <ExternalLink size={14} />
            {portalLoading ? 'Opening...' : 'Manage billing & invoices'}
          </button>
        </div>
      )}
    </div>
  );
}
