# Implement Team Access and API Access for MetricHQ

## Project Context
MetricHQ is a profit tracking dashboard for web SaaS founders running paid ads. It combines ad spend (Google Ads, Meta, TikTok, LinkedIn) with revenue (Stripe, PostHog) to show profit by country/campaign.

**Stack:** Next.js frontend (Vercel), Express backend (Railway), PostgreSQL (Railway), Clerk auth.
**Deployed:** Frontend at `metrichq.vercel.app`, backend at `metrichq-production.up.railway.app`.

## Current Auth/User Model
- **Clerk** handles frontend auth. Clerk user ID is sent to the backend on every request.
- **`users` table**: `id` (serial PK), `clerk_user_id` (unique), `email`, `created_at`. The function `getOrCreateUserByClerkId()` in `backend/routes/auth.js` maps Clerk IDs to internal user IDs.
- **`subscriptions` table**: One row per user (`user_id UNIQUE`). Fields: `stripe_customer_id`, `stripe_subscription_id`, `plan` (starter/growth/pro), `status` (trialing/active/expired/cancelled/past_due), `trial_end`, `current_period_end`, `cancel_at_period_end`.
- **Trial**: Every new user auto-gets 14-day Pro trial. Lazy expiry check in `getUserSubscription()`.
- **Billing**: Stripe checkout, portal, and webhooks in `backend/routes/billing.js`. Plan limits defined in `backend/config/plans.js`.

## 3 Pricing Tiers
| Plan | Price | Ad Platforms | Sync | Retention | Team | API |
|------|-------|-------------|------|-----------|------|-----|
| Starter | $29/mo | 1 | 24h | 180 days | No | No |
| Growth | $49/mo | Unlimited | 4h | 1 year | No | No |
| Pro | $99/mo | Unlimited | 4h | Unlimited | Yes | Yes |

Team access and API access are listed on the pricing page as Pro-only features with "(coming soon)" text. They need to be built.

## Feature 1: Team Access (Pro only)

Build the ability for Pro users to invite team members to their account. Team members should see the same dashboard data (same connected platforms, same metrics).

### Key design decisions to make:
- **Invite flow**: Email-based invites. Invited user signs up via Clerk, gets linked to the team owner's account.
- **Roles**: Keep it simple — Owner (full access, manages billing + integrations) and Member (read-only dashboard access). Don't over-engineer roles.
- **Data model**: A team member's API requests should resolve to the *owner's* internal user ID for data queries, so they see the owner's connected platforms and metrics.
- **Subscription**: The subscription belongs to the owner. Team members don't need their own subscription. If the owner downgrades from Pro, team members lose access.

### Suggested schema:
```sql
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  owner_user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE team_members (
  id SERIAL PRIMARY KEY,
  team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,  -- NULL until invite accepted
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',  -- 'owner' or 'member'
  invite_status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'accepted'
  invite_token TEXT UNIQUE,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(team_id, email)
);
```

### What needs to happen:
1. **Migration**: Create `teams` and `team_members` tables
2. **Backend endpoints**:
   - `POST /api/team/invite` — Owner sends invite (creates pending team_member row, generates invite token)
   - `POST /api/team/accept` — Invited user accepts (links their user_id, sets accepted)
   - `GET /api/team` — List team members for the owner
   - `DELETE /api/team/members/:id` — Owner removes a member
3. **Data resolution**: When a team member makes API requests, resolve to the team owner's user ID for metrics/connections queries. Add a helper like `resolveDataOwner(internalUserId)` that checks if the user is a team member and returns the owner's ID if so.
4. **Frontend**: Settings page section for team management (invite form, member list, remove button). Only shown for Pro plan users.
5. **Update plan limits**: Add `teamAccess: boolean` to PLAN_LIMITS (true for Pro only)
6. **Remove "(coming soon)"** from the Pro plan features text in `frontend/lib/plans.ts`

### Key files to read first:
- `backend/routes/auth.js` — `getOrCreateUserByClerkId()` function
- `backend/services/subscription.js` — `getUserSubscription()`
- `backend/config/plans.js` — PLAN_LIMITS
- `backend/server.js` — All API routes, see how userId flows through
- `backend/db/migrations/` — Existing migration files (follow the numbering pattern)
- `frontend/app/(dashboard)/settings/page.tsx` — Settings page (if exists, otherwise create)
- `frontend/components/SubscriptionProvider.tsx` — Frontend subscription context
- `frontend/lib/plans.ts` — Pricing page feature lists

## Feature 2: API Access (Pro only)

Build a REST API that Pro users can query programmatically to pull their metrics data. This is for users who want to pipe MetricHQ data into their own dashboards, spreadsheets, or internal tools.

### Key design decisions:
- **Auth**: API key-based (not Clerk). Users generate API keys from settings page. Keys stored hashed in DB.
- **Endpoints**: Keep it minimal — mirror what the dashboard shows:
  - `GET /api/v1/metrics` — Summary metrics (spend, revenue, profit) for a date range
  - `GET /api/v1/metrics/timeseries` — Daily time series data
  - `GET /api/v1/metrics/countries` — Country breakdown
  - `GET /api/v1/metrics/campaigns` — Campaign data by platform
- **Rate limiting**: Simple per-key rate limit (e.g., 100 req/hour). Use in-memory counter or Redis if available.
- **Response format**: JSON, same shape as the internal `/api/metrics` endpoint but cleaned up for external consumption.

### Suggested schema:
```sql
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,  -- First 8 chars for display (e.g., "mhq_a1b2...")
  name TEXT DEFAULT 'Default',
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);
```

### What needs to happen:
1. **Migration**: Create `api_keys` table
2. **Key generation**: `POST /api/settings/api-keys` — Generate key, return full key once (user must copy it), store hashed
3. **Key management**: `GET /api/settings/api-keys` (list, masked), `DELETE /api/settings/api-keys/:id` (revoke)
4. **API middleware**: Auth middleware for `/api/v1/*` routes that validates API key from `Authorization: Bearer mhq_...` header, resolves to user, checks Pro plan
5. **API routes**: The 4 endpoints above, reusing `aggregateMetrics()` from `backend/services/aggregator.js`
6. **Rate limiting**: Simple middleware with in-memory Map (reset hourly)
7. **Frontend**: Settings page section for API key management (generate, copy, list, revoke). Only shown for Pro plan users.
8. **Update plan limits**: Add `apiAccess: boolean` to PLAN_LIMITS (true for Pro only)
9. **Remove "(coming soon)"** from the Pro plan features text

### Key files:
- `backend/services/aggregator.js` — `aggregateMetrics()` returns the data shape you'll expose
- `backend/server.js` — Register new routes here
- `backend/config/plans.js` — Add apiAccess/teamAccess to limits

## Implementation Order
1. Team access first (simpler, more impactful for Pro justification)
2. API access second (builds on the same settings page)
3. Update pricing page text last (remove "coming soon")

## Important Notes
- Bash paths: use `/c/Users/User/Profit-tracker/` (not `C:\` in bash)
- Migrations auto-run on Railway deploy (`npm start` runs `run-migrations.js` first). Follow existing numbering in `backend/db/migrations/`.
- All new frontend files must be committed for Vercel builds
- Don't over-engineer roles/permissions. Owner + Member is enough.
- The API key should be shown to the user exactly once after creation (like Stripe/OpenAI pattern)
