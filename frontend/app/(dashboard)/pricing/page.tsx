'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Check, Loader2, ExternalLink } from 'lucide-react';
import { useSubscription } from '../../../components/SubscriptionProvider';
import { PLANS } from '../../../lib/plans';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

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
  const currentPlan = subscription?.plan?.toLowerCase();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text-heading mb-2">
          {isActive ? 'Manage your plan' : 'Choose your plan'}
        </h1>
        <p className="text-text-dim text-[13px]">
          A fraction of what Triple Whale or Hyros charge. No hidden fees.
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
          const isLoading = checkoutLoading === priceId;

          return (
            <div
              key={plan.name}
              className={`rounded-xl border p-6 relative ${
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
                <RollingPrice value={price} />
                <span className="text-text-dim text-sm">/mo</span>
                {yearly && (
                  <span className="text-text-dim text-[12px] ml-2">billed yearly</span>
                )}
              </div>

              <ul className="space-y-2.5 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-text-body">
                    <Check size={16} className="text-success mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

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
                <button
                  onClick={() => handleCheckout(priceId)}
                  disabled={isLoading || !priceId || subLoading}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                    plan.popular
                      ? 'bg-accent hover:bg-accent-hover text-accent-text'
                      : 'bg-bg-elevated hover:bg-bg-hover text-text-heading border border-border-dim'
                  }`}
                >
                  {isLoading && <Loader2 size={14} className="animate-spin" />}
                  {isActive ? 'Switch to this plan' : 'Start free trial'}
                </button>
              )}

              {!isActive && (
                <p className="text-[12px] text-text-dim text-center mt-2">14 days free. No card required.</p>
              )}
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
    </div>
  );
}
