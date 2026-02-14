# MetricHQ — Tier Implementation Plan

## Overview

Three paid tiers + 14-day free trial (no card). During trial, user gets full Pro access.
After trial expires, they must pick a plan or lose access.

---

## Tier Comparison

| Feature | Starter ($29/mo) | Growth ($49/mo) | Pro ($99/mo) |
|---|---|---|---|
| Ad platforms | 1 (pick one) | All | All |
| Stripe revenue | Yes | Yes | Yes |
| Country breakdown | Yes | Yes | Yes |
| Campaign P&L | No | Yes | Yes |
| Sync frequency | Every 24h | Every 4h | Every 4h |
| Data retention | 30 days | 90 days | Unlimited |
| Team members | 1 | 1 | Up to 5 |
| API access | No | No | Yes |
| Priority support | No | No | Yes |

---

## What Needs to Be Built

### 1. Stripe Billing Integration (Backend)

**New:**
- [ ] Create 3 Stripe Products + Prices (monthly + yearly for each = 6 prices)
- [ ] `POST /api/billing/checkout` — creates Stripe Checkout session for chosen plan
- [ ] `POST /api/billing/portal` — creates Stripe Customer Portal session (manage/cancel)
- [ ] `POST /api/billing/webhook` — handles Stripe webhook events:
  - `checkout.session.completed` → activate subscription
  - `invoice.paid` → extend subscription
  - `invoice.payment_failed` → mark past due
  - `customer.subscription.deleted` → mark cancelled
- [ ] Store in DB: `subscriptions` table (userId, stripeCustomerId, stripePriceId, plan, status, trialEnd, currentPeriodEnd)

### 2. Trial System (Backend)

**New:**
- [ ] On user signup → create subscription record with `status: 'trialing'`, `trialEnd: now + 14 days`, `plan: 'pro'` (full access during trial)
- [ ] Middleware: `requireActiveSubscription` — checks if user has active subscription OR is within trial period
- [ ] When trial expires and no payment → `status: 'expired'`
- [ ] Expired users can still log in but see an "upgrade" gate instead of dashboard

### 3. Feature Gating (Backend + Frontend)

**Backend — new middleware/checks:**
- [ ] `GET /api/billing/subscription` — returns current plan, status, trialEnd, limits
- [ ] Sync service: respect `syncFrequency` per plan (24h for Starter, 4h for Growth/Pro)
- [ ] Sync service: respect `maxPlatforms` per plan (1 for Starter, unlimited for Growth/Pro)
- [ ] Aggregator: respect `dataRetention` per plan (trim old data or gate queries beyond retention window)
- [ ] Metrics API: hide campaign breakdown for Starter plan

**Frontend — conditional rendering:**
- [ ] Fetch subscription on dashboard load, store in context
- [ ] Starter: hide campaign tables, show "Upgrade to Growth to see campaign P&L" prompt
- [ ] Starter: on integrations page, allow connecting only 1 ad platform. Show lock icon on others with upgrade prompt.
- [ ] All plans: show trial countdown banner during trial ("X days left in your trial")
- [ ] Expired: redirect to upgrade/pricing page instead of dashboard

### 4. Upgrade/Pricing Page (Frontend)

**New page: `/pricing` or in-app upgrade modal**
- [ ] Show 3 plan cards (reuse landing page PricingSection component)
- [ ] "Current plan" badge on active plan
- [ ] Checkout button → calls `/api/billing/checkout` → redirects to Stripe Checkout
- [ ] "Manage subscription" link → calls `/api/billing/portal` → Stripe Customer Portal

### 5. Team/Seats (Pro only, can defer)

- [ ] `team_members` table (teamId, userId, role)
- [ ] Invite flow: owner sends email invite, invitee signs up and joins team
- [ ] Shared dashboard: team members see same data as owner
- [ ] Can defer this to v2 — just show "Coming soon" on Pro plan

### 6. API Access (Pro only, can defer)

- [ ] API key generation in settings
- [ ] `GET /api/v1/metrics` — same as dashboard metrics but authenticated via API key
- [ ] Rate limiting per key
- [ ] Can defer to v2

---

## Implementation Priority

### Phase 1 — Ship billing (required to charge money)
1. Stripe products/prices setup
2. Checkout + webhook + subscription table
3. Trial system (auto-create on signup)
4. Subscription status API endpoint
5. Expired state gate (upgrade page)

### Phase 2 — Feature gating (makes tiers real)
6. Platform limit for Starter (1 ad platform)
7. Sync frequency per plan
8. Campaign P&L gating for Starter
9. Data retention enforcement
10. Trial countdown banner

### Phase 3 — Polish & extras (can defer)
11. Stripe Customer Portal (manage/cancel)
12. Team seats for Pro
13. API access for Pro
14. In-app upgrade prompts at gate points

---

## Database Changes

```sql
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  plan TEXT NOT NULL DEFAULT 'trial',  -- 'trial', 'starter', 'growth', 'pro'
  status TEXT NOT NULL DEFAULT 'trialing',  -- 'trialing', 'active', 'past_due', 'cancelled', 'expired'
  trial_end TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Notes

- During 14-day trial, user gets FULL Pro access. This lets them experience everything before deciding. Restricting during trial hurts conversion.
- Trial countdown should be visible but not annoying. Small banner at top, not a modal.
- When trial expires, don't delete data. Lock access and show "Your data is still here — upgrade to access it." This creates urgency.
- Stripe Customer Portal handles plan changes, cancellations, payment method updates. Don't build this yourself.
