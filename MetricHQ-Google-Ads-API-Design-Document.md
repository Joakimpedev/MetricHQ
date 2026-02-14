# MetricHQ — Google Ads API Tool Design Document

## 1. Company Overview

**Company**: MetricHQ
**Website**: https://metrichq.vercel.app
**Contact**: andersdavan21@gmail.com
**Location**: Estonia

MetricHQ is a SaaS analytics dashboard that helps small business owners and SaaS founders track their advertising profitability by combining ad spend data with revenue data in a single view.

## 2. Tool Purpose

MetricHQ uses the Google Ads API to **read campaign performance data** so users can see their Google Ads spend alongside their revenue (from Stripe, PostHog, etc.) in one dashboard. This gives users a clear view of profit, ROAS, and CPA across all their marketing channels.

**We only read data. We never create, modify, or delete any campaigns, ads, ad groups, or other Google Ads resources.**

## 3. API Usage Details

### Features That Use the Google Ads API

| Feature | API Method | Purpose |
|---------|-----------|---------|
| Campaign performance sync | `GoogleAdsService.SearchStream` | Read spend, impressions, and clicks by campaign and country |

### GAQL Query Used

```sql
SELECT campaign.id, campaign.name, geographic_view.country_criterion_id,
       segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks
FROM geographic_view
WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
  AND campaign.status != 'REMOVED'
```

### Data Flow

1. User connects their Google Ads account via OAuth 2.0 consent screen
2. MetricHQ stores the OAuth refresh token securely in a PostgreSQL database
3. Every 4 hours, a background sync job refreshes the access token and pulls the last 3 days of campaign data
4. Data is stored locally in MetricHQ's database and displayed in the dashboard
5. Users see spend by campaign and country alongside their revenue data

### API Call Volume

- **Per user**: ~1 API call every 4 hours (background sync) + 1 on-demand when user triggers manual refresh
- **Expected total**: Low volume. Targeting small businesses, estimated <100 users in the first year.

## 4. OAuth 2.0 Implementation

- **Authorization endpoint**: `https://accounts.google.com/o/oauth2/v2/auth`
- **Token endpoint**: `https://oauth2.googleapis.com/token`
- **Scope requested**: `https://www.googleapis.com/auth/adwords`
- **Access type**: `offline` (to get refresh token for background sync)
- **Redirect URI**: `https://metrichq-production.up.railway.app/auth/google/callback`

### Token Storage and Refresh

- Refresh tokens are stored encrypted in PostgreSQL
- Access tokens are refreshed automatically when they are within 5 minutes of expiry
- If a refresh fails, the sync is marked as errored and the user is prompted to reconnect

## 5. User Interface

### Integrations Page
Users connect Google Ads from the Integrations page by clicking "Connect Google Ads," which initiates the OAuth flow. Once connected, the card shows a green "Connected" status.

### Dashboard
The dashboard displays:
- Total ad spend across all connected platforms
- Campaign-level breakdown table showing: campaign name, spend, impressions, clicks, CTR
- Country-level spend breakdown
- Profit calculation (revenue minus total ad spend)

## 6. Architecture

```
User Browser → MetricHQ Frontend (Vercel/Next.js)
                    ↓
            MetricHQ Backend (Railway/Node.js)
                    ↓
            Google Ads API (read-only)
                    ↓
            PostgreSQL Database (Railway)
```

## 7. Compliance

- **Read-only access**: We only use `SearchStream` to read reporting data. No write operations.
- **Data retention**: Users can disconnect at any time, which removes their stored tokens.
- **No reselling**: Data is only shown to the account owner in their own dashboard.
- **Rate limiting**: We respect Google's API rate limits and use exponential backoff on errors.
- **Privacy**: We do not share any Google Ads data with third parties.

## 8. Terms of Service

MetricHQ complies with:
- Google Ads API Terms and Conditions
- Google API Services User Data Policy
- Required minimum functionality as outlined in the Google Ads API policy
