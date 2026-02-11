# Complete Build & Deploy Guide: Profit Tracker

**Date:** 2026-02-12
**Goal:** Build and deploy a web-based profit tracking app from scratch to production

---

## Table of Contents

1. [Tech Stack Overview](#tech-stack-overview)
2. [Prerequisites](#prerequisites)
3. [Phase 1: Local Development Setup](#phase-1-local-development-setup)
4. [Phase 2: Build the App (Week by Week)](#phase-2-build-the-app-week-by-week)
5. [Phase 3: Deploy to Production](#phase-3-deploy-to-production)
6. [Phase 4: Domain & DNS Setup](#phase-4-domain--dns-setup)
7. [Phase 5: Going Live](#phase-5-going-live)
8. [Troubleshooting](#troubleshooting)

---

## Tech Stack Overview

### What You're Building

```
┌──────────────────────────────────────────────────────┐
│              USER'S BROWSER                          │
│  https://profittracker.app                           │
└────────────────┬─────────────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────────────┐
│            FRONTEND (Vercel)                         │
│  - React/Next.js                                     │
│  - Dashboard UI                                      │
│  - User authentication (Clerk)                       │
└────────────────┬─────────────────────────────────────┘
                 │
                 ↓ API calls
┌──────────────────────────────────────────────────────┐
│            BACKEND (Railway)                         │
│  - Node.js + Express                                 │
│  - OAuth flows (TikTok, Meta)                        │
│  - API integrations                                  │
│  - Data aggregation                                  │
└────────────────┬─────────────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────────────┐
│          DATABASE (Railway/Supabase)                 │
│  - PostgreSQL                                        │
│  - User data, tokens, cached metrics                 │
└──────────────────────────────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────────────┐
│          EXTERNAL APIs                               │
│  - TikTok Ads API                                    │
│  - Meta Marketing API                                │
│  - PostHog API                                       │
└──────────────────────────────────────────────────────┘
```

### Tech Stack Decisions

| Component | Technology | Why? | Cost |
|-----------|-----------|------|------|
| **Frontend** | Next.js (React) | Modern, fast, easy to deploy | Free (Vercel) |
| **Backend** | Node.js + Express | JavaScript full-stack, easy APIs | $5/mo (Railway) |
| **Database** | PostgreSQL | Reliable, standard SQL | $5/mo (Railway) |
| **Auth** | Clerk.com | Pre-built auth, easy integration | Free (<10k users) |
| **Hosting - Frontend** | Vercel | Free, automatic deploys, fast CDN | Free |
| **Hosting - Backend** | Railway | Easy PostgreSQL + Node.js hosting | $5-10/mo |
| **Domain** | Namecheap/Cloudflare | Standard domain registrar | $10/year |

**Total Monthly Cost:** ~$10-15/mo until you have paying customers

---

## Prerequisites

### What You Need Before Starting

1. **Code Editor**
   - ✅ Cursor (recommended - AI-powered)
   - OR VS Code with GitHub Copilot

2. **Accounts to Create** (all free tiers):
   - [ ] GitHub account (code hosting)
   - [ ] Vercel account (frontend hosting)
   - [ ] Railway account (backend + database)
   - [ ] Clerk account (user authentication)
   - [ ] Domain registrar (Namecheap or Cloudflare)

3. **Software to Install**:
   - [ ] Node.js (v18 or higher) - https://nodejs.org
   - [ ] Git - https://git-scm.com
   - [ ] PostgreSQL (optional for local dev) - https://postgresql.org

4. **API Access** (apply early - takes 2-3 days):
   - [ ] TikTok Marketing API - https://ads.tiktok.com/marketing_api/homepage
   - [ ] Meta Marketing API - https://developers.facebook.com/apps

### Verify Installation

```bash
# Check Node.js version
node --version
# Should output: v18.0.0 or higher

# Check npm version
npm --version
# Should output: 9.0.0 or higher

# Check Git version
git --version
# Should output: git version 2.x.x
```

---

## Phase 1: Local Development Setup

### Step 1: Create Project Structure

**Open Cursor (or your terminal):**

```bash
# Create project folder
mkdir profit-tracker
cd profit-tracker

# Create frontend (Next.js)
npx create-next-app@latest frontend
# When prompted:
# - TypeScript: Yes
# - ESLint: Yes
# - Tailwind CSS: Yes
# - App Router: Yes
# - Import alias: Yes (@/*)

# Create backend (Node.js + Express)
mkdir backend
cd backend
npm init -y
npm install express cors dotenv pg axios
npm install --save-dev nodemon

cd ..
```

**Your folder structure:**
```
profit-tracker/
├── frontend/          ← Next.js React app
│   ├── app/
│   ├── components/
│   ├── public/
│   └── package.json
└── backend/           ← Node.js API server
    ├── server.js
    ├── .env
    └── package.json
```

---

### Step 2: Set Up Backend (API Server)

**Create `backend/server.js`:**

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend running!' });
});

// Mock API endpoint (we'll replace this later)
app.get('/api/metrics', (req, res) => {
  res.json({
    countries: [
      {
        code: 'NO',
        name: 'Norway',
        spend: 670,
        revenue: 850,
        profit: 180,
        roas: 1.27,
        purchases: 42
      },
      {
        code: 'SE',
        name: 'Sweden',
        spend: 275,
        revenue: 320,
        profit: 45,
        roas: 1.16,
        purchases: 16
      }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
});
```

**Create `backend/.env`:**

```env
PORT=4000
NODE_ENV=development

# Database (will add later)
DATABASE_URL=

# TikTok API (will add after approval)
TIKTOK_APP_ID=
TIKTOK_APP_SECRET=

# Meta API (will add after approval)
META_APP_ID=
META_APP_SECRET=

# Clerk (will add after setup)
CLERK_SECRET_KEY=
```

**Update `backend/package.json`:**

Add this to scripts section:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

**Test backend:**

```bash
cd backend
npm run dev
# Should see: ✅ Backend server running on http://localhost:4000

# Open browser: http://localhost:4000/health
# Should see: {"status":"ok","message":"Backend running!"}
```

---

### Step 3: Set Up Frontend (Dashboard UI)

**Create `frontend/app/page.tsx`:**

```typescript
'use client';

import { useState } from 'react';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">💰 Profit Tracker</h1>
        <p className="text-slate-400 mb-8">See your real profit by country</p>

        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold mb-8"
        >
          {loading ? 'Loading...' : '🔄 Refresh Data'}
        </button>

        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.countries.map((country: any) => (
              <div key={country.code} className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{country.code === 'NO' ? '🇳🇴' : '🇸🇪'}</span>
                  <h2 className="text-2xl font-bold">{country.name}</h2>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ad Spend:</span>
                    <span className="font-semibold">${country.spend}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Revenue:</span>
                    <span className="font-semibold">${country.revenue}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-700 pt-2 mt-2">
                    <span className="text-slate-400">Profit:</span>
                    <span className={`font-bold text-xl ${country.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${country.profit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ROAS:</span>
                    <span className="font-semibold">{country.roas}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Purchases:</span>
                    <span className="font-semibold">{country.purchases}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Test frontend:**

```bash
# Open new terminal
cd frontend
npm run dev
# Should see: Ready on http://localhost:3000

# Open browser: http://localhost:3000
# Click "Refresh Data" button
# Should see Norway and Sweden cards with metrics
```

**✅ Checkpoint:** You now have a working frontend + backend locally!

---

## Phase 2: Build the App (Week by Week)

### Week 1: Database + User Authentication

#### Step 1: Set Up Database (Railway)

1. **Go to https://railway.app**
2. Sign up with GitHub
3. Click "New Project" → "Provision PostgreSQL"
4. Click on PostgreSQL → "Variables" tab
5. Copy `DATABASE_URL`

**Update `backend/.env`:**

```env
DATABASE_URL=postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
```

#### Step 2: Create Database Schema

**Create `backend/db/schema.sql`:**

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Connected accounts
CREATE TABLE connected_accounts (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'tiktok', 'meta', 'posthog'
  account_id VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Cached metrics
CREATE TABLE metrics_cache (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  country_code VARCHAR(2) NOT NULL,
  date DATE NOT NULL,
  platform VARCHAR(50) NOT NULL, -- 'tiktok', 'meta', 'posthog'
  spend DECIMAL(10,2),
  revenue DECIMAL(10,2),
  impressions INT,
  clicks INT,
  purchases INT,
  cached_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, country_code, date, platform)
);

-- Indexes for performance
CREATE INDEX idx_metrics_user_date ON metrics_cache(user_id, date);
CREATE INDEX idx_connected_accounts_user ON connected_accounts(user_id);
```

**Install PostgreSQL client:**

```bash
cd backend
npm install pg
```

**Create `backend/db/database.js`:**

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected!');
  }
});

module.exports = { pool };
```

**Run schema:**

```bash
# Connect to Railway database
# Option 1: Use Railway CLI
npx @railway/cli login
npx @railway/cli connect
psql $DATABASE_URL < db/schema.sql

# Option 2: Use TablePlus/pgAdmin (GUI tools)
# Connect with DATABASE_URL and run schema.sql
```

#### Step 3: Add User Authentication (Clerk)

1. **Go to https://clerk.com**
2. Sign up → Create Application
3. Choose: Email + Google Sign In
4. Copy API keys

**Update `backend/.env`:**

```env
CLERK_SECRET_KEY=sk_test_xxxxx
```

**Install Clerk in frontend:**

```bash
cd frontend
npm install @clerk/nextjs
```

**Update `frontend/app/layout.tsx`:**

```typescript
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

**Create `frontend/middleware.ts`:**

```typescript
import { authMiddleware } from '@clerk/nextjs';

export default authMiddleware({
  publicRoutes: ['/'],
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

**Update `frontend/.env.local`:**

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
```

**Add sign-in button to dashboard:**

```typescript
import { SignInButton, SignOutButton, useUser } from '@clerk/nextjs';

export default function Dashboard() {
  const { isSignedIn, user } = useUser();

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">💰 Profit Tracker</h1>
          <p className="text-slate-400 mb-8">Track your app profit by country</p>
          <SignInButton mode="modal">
            <button className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-semibold">
              Sign In
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  // ... rest of dashboard code
}
```

---

### Week 2: TikTok & Meta OAuth Integration

#### Step 1: TikTok OAuth Flow

**Create `backend/routes/auth.js`:**

```javascript
const express = require('express');
const router = express.Router();
const axios = require('axios');

// TikTok OAuth - Step 1: Redirect to TikTok
router.get('/tiktok', (req, res) => {
  const { userId } = req.query;

  const authUrl = `https://business-api.tiktok.com/portal/auth`;
  const params = new URLSearchParams({
    app_id: process.env.TIKTOK_APP_ID,
    state: userId, // Pass user ID to identify them after redirect
    redirect_uri: `${process.env.BACKEND_URL}/auth/tiktok/callback`,
    rid: Date.now().toString()
  });

  res.redirect(`${authUrl}?${params}`);
});

// TikTok OAuth - Step 2: Handle callback
router.get('/tiktok/callback', async (req, res) => {
  const { auth_code, state: userId } = req.query;

  try {
    // Exchange auth code for access token
    const response = await axios.post('https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/', {
      app_id: process.env.TIKTOK_APP_ID,
      secret: process.env.TIKTOK_APP_SECRET,
      auth_code: auth_code
    });

    const { access_token, advertiser_ids } = response.data.data;

    // Save to database
    await pool.query(
      `INSERT INTO connected_accounts (user_id, platform, account_id, access_token)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, platform) DO UPDATE
       SET access_token = $4, updated_at = NOW()`,
      [userId, 'tiktok', advertiser_ids[0], access_token]
    );

    // Redirect back to frontend
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?tiktok=connected`);
  } catch (error) {
    console.error('TikTok OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=tiktok_failed`);
  }
});

module.exports = router;
```

**Update `backend/server.js`:**

```javascript
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);
```

#### Step 2: Meta OAuth Flow

**Add to `backend/routes/auth.js`:**

```javascript
// Meta OAuth - Step 1: Redirect to Facebook
router.get('/meta', (req, res) => {
  const { userId } = req.query;

  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth`;
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: `${process.env.BACKEND_URL}/auth/meta/callback`,
    state: userId,
    scope: 'ads_read,read_insights'
  });

  res.redirect(`${authUrl}?${params}`);
});

// Meta OAuth - Step 2: Handle callback
router.get('/meta/callback', async (req, res) => {
  const { code, state: userId } = req.query;

  try {
    // Exchange code for access token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token`;
    const response = await axios.get(tokenUrl, {
      params: {
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        redirect_uri: `${process.env.BACKEND_URL}/auth/meta/callback`,
        code: code
      }
    });

    const { access_token } = response.data;

    // Get user's ad accounts
    const accountsResponse = await axios.get(
      `https://graph.facebook.com/v19.0/me/adaccounts`,
      {
        params: { access_token }
      }
    );

    const adAccountId = accountsResponse.data.data[0]?.id;

    // Save to database
    await pool.query(
      `INSERT INTO connected_accounts (user_id, platform, account_id, access_token)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, platform) DO UPDATE
       SET access_token = $4, updated_at = NOW()`,
      [userId, 'meta', adAccountId, access_token]
    );

    res.redirect(`${process.env.FRONTEND_URL}/dashboard?meta=connected`);
  } catch (error) {
    console.error('Meta OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=meta_failed`);
  }
});
```

---

### Week 3: PostHog Integration & Data Aggregation

#### Step 1: PostHog API Integration

**Create `backend/services/posthog.js`:**

```javascript
const axios = require('axios');

async function fetchRevenueData(apiKey, projectId, startDate, endDate) {
  const query = `
    SELECT
      properties.country_code AS country,
      toDate(timestamp) AS date,
      sum(properties.revenue) AS total_revenue,
      count(*) AS purchases
    FROM events
    WHERE
      event = 'rc_initial_purchase'
      AND timestamp >= '${startDate}'
      AND timestamp < '${endDate}'
    GROUP BY country, date
    ORDER BY date DESC
  `;

  try {
    const response = await axios.post(
      `https://app.posthog.com/api/projects/${projectId}/query/`,
      {
        query: {
          kind: 'HogQLQuery',
          query: query
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.results;
  } catch (error) {
    console.error('PostHog API error:', error);
    throw error;
  }
}

module.exports = { fetchRevenueData };
```

#### Step 2: TikTok API Integration

**Create `backend/services/tiktok.js`:**

```javascript
const axios = require('axios');

async function fetchAdSpend(accessToken, advertiserId, startDate, endDate) {
  try {
    const response = await axios.get(
      'https://business-api.tiktok.com/open_api/v1.2/reports/integrated/get/',
      {
        params: {
          advertiser_id: advertiserId,
          dimensions: JSON.stringify(['campaign_id', 'country_code']),
          metrics: JSON.stringify(['spend', 'impressions', 'clicks']),
          start_date: startDate,
          end_date: endDate,
          page_size: 1000
        },
        headers: {
          'Access-Token': accessToken
        }
      }
    );

    return response.data.data.list;
  } catch (error) {
    console.error('TikTok API error:', error);
    throw error;
  }
}

module.exports = { fetchAdSpend };
```

#### Step 3: Meta API Integration

**Create `backend/services/meta.js`:**

```javascript
const axios = require('axios');

async function fetchAdSpend(accessToken, adAccountId, startDate, endDate) {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v19.0/${adAccountId}/insights`,
      {
        params: {
          access_token: accessToken,
          fields: 'campaign_name,country,spend,impressions,clicks',
          time_range: JSON.stringify({
            since: startDate,
            until: endDate
          }),
          level: 'campaign',
          breakdowns: 'country'
        }
      }
    );

    return response.data.data;
  } catch (error) {
    console.error('Meta API error:', error);
    throw error;
  }
}

module.exports = { fetchAdSpend };
```

#### Step 4: Data Aggregation

**Create `backend/services/aggregator.js`:**

```javascript
const { fetchRevenueData } = require('./posthog');
const { fetchAdSpend: fetchTikTokSpend } = require('./tiktok');
const { fetchAdSpend: fetchMetaSpend } = require('./meta');

async function aggregateMetrics(userId, startDate, endDate) {
  // Get user's connected accounts
  const accounts = await pool.query(
    'SELECT platform, account_id, access_token FROM connected_accounts WHERE user_id = $1',
    [userId]
  );

  const accountMap = {};
  accounts.rows.forEach(acc => {
    accountMap[acc.platform] = acc;
  });

  // Fetch data from all sources
  const [revenueData, tiktokData, metaData] = await Promise.all([
    accountMap.posthog ? fetchRevenueData(accountMap.posthog.access_token, accountMap.posthog.account_id, startDate, endDate) : [],
    accountMap.tiktok ? fetchTikTokSpend(accountMap.tiktok.access_token, accountMap.tiktok.account_id, startDate, endDate) : [],
    accountMap.meta ? fetchMetaSpend(accountMap.meta.access_token, accountMap.meta.account_id, startDate, endDate) : []
  ]);

  // Aggregate by country
  const countryMetrics = {};

  // Process revenue data
  revenueData.forEach(([country, date, revenue, purchases]) => {
    if (!countryMetrics[country]) {
      countryMetrics[country] = { revenue: 0, spend: 0, purchases: 0 };
    }
    countryMetrics[country].revenue += parseFloat(revenue);
    countryMetrics[country].purchases += parseInt(purchases);
  });

  // Process TikTok spend
  tiktokData.forEach(row => {
    const country = row.country_code;
    if (!countryMetrics[country]) {
      countryMetrics[country] = { revenue: 0, spend: 0, purchases: 0 };
    }
    countryMetrics[country].spend += parseFloat(row.spend);
  });

  // Process Meta spend
  metaData.forEach(row => {
    const country = row.country;
    if (!countryMetrics[country]) {
      countryMetrics[country] = { revenue: 0, spend: 0, purchases: 0 };
    }
    countryMetrics[country].spend += parseFloat(row.spend);
  });

  // Calculate profit and ROAS
  const results = Object.entries(countryMetrics).map(([country, data]) => ({
    country,
    revenue: data.revenue,
    spend: data.spend,
    profit: data.revenue - data.spend,
    roas: data.spend > 0 ? (data.revenue / data.spend).toFixed(2) : 0,
    purchases: data.purchases
  }));

  return results;
}

module.exports = { aggregateMetrics };
```

**Update `backend/server.js`:**

```javascript
const { aggregateMetrics } = require('./services/aggregator');

app.get('/api/metrics', async (req, res) => {
  const { userId, startDate, endDate } = req.query;

  try {
    const metrics = await aggregateMetrics(userId, startDate, endDate);
    res.json({ countries: metrics });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});
```

---

## Phase 3: Deploy to Production

**Phase 2 Week 4** = Deploy to production. For a **step-by-step checklist** using this single repo (backend + frontend), see **[DEPLOY-WEEK4.md](./DEPLOY-WEEK4.md)**.

### Step 1: Deploy Backend (Railway)

1. **Push code to GitHub:**

```bash
cd backend
git init
git add .
git commit -m "Initial backend commit"
git branch -M main

# Create repo on GitHub, then:
git remote add origin https://github.com/yourusername/profit-tracker-backend.git
git push -u origin main
```

2. **Deploy to Railway:**

   - Go to https://railway.app
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your backend repo
   - Railway auto-detects Node.js
   - Add environment variables:
     - `DATABASE_URL` (auto-added from PostgreSQL)
     - `TIKTOK_APP_ID`
     - `TIKTOK_APP_SECRET`
     - `META_APP_ID`
     - `META_APP_SECRET`
     - `CLERK_SECRET_KEY`
     - `FRONTEND_URL` = https://your-app.vercel.app
   - Click "Deploy"

3. **Get backend URL:**
   - Railway provides: `https://profit-tracker-backend-production.up.railway.app`
   - Save this URL!

---

### Step 2: Deploy Frontend (Vercel)

1. **Update frontend to use production backend:**

**Create `frontend/.env.production`:**

```env
NEXT_PUBLIC_API_URL=https://profit-tracker-backend-production.up.railway.app
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx
```

**Update API calls in `frontend/app/page.tsx`:**

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const response = await fetch(`${API_URL}/api/metrics`);
```

2. **Push code to GitHub:**

```bash
cd frontend
git init
git add .
git commit -m "Initial frontend commit"
git branch -M main

git remote add origin https://github.com/yourusername/profit-tracker-frontend.git
git push -u origin main
```

3. **Deploy to Vercel:**

   - Go to https://vercel.com
   - Click "New Project"
   - Import GitHub repo (profit-tracker-frontend)
   - Framework: Next.js (auto-detected)
   - Add environment variables (from `.env.production`)
   - Click "Deploy"

4. **Get frontend URL:**
   - Vercel provides: `https://profit-tracker-frontend.vercel.app`
   - Save this URL!

---

## Phase 4: Domain & DNS Setup

### Step 1: Buy Domain

**Option 1: Namecheap (Recommended)**
1. Go to https://namecheap.com
2. Search for domain: `profittracker.app` or `profittracker.io`
3. Buy domain (~$10-15/year)

**Option 2: Cloudflare Registrar**
1. Go to https://www.cloudflare.com
2. Register domain (at-cost pricing, ~$8-10/year)

---

### Step 2: Configure DNS

**In Vercel:**
1. Go to your project → Settings → Domains
2. Click "Add Domain"
3. Enter: `profittracker.app`
4. Vercel shows DNS records you need to add

**In Your Domain Registrar (Namecheap/Cloudflare):**
1. Go to DNS settings
2. Add these records:

```
Type: A
Host: @
Value: 76.76.21.21 (Vercel IP)

Type: CNAME
Host: www
Value: cname.vercel-dns.com
```

**Wait 10-60 minutes for DNS to propagate.**

**Verify:**
- Go to https://profittracker.app
- Should see your app!
- SSL certificate auto-issued by Vercel

---

### Step 3: Configure Backend Domain (Optional)

**Option 1: Use Railway domain**
- Railway provides: `backend-production.up.railway.app`
- This works fine!

**Option 2: Custom subdomain**
- Buy domain: `api.profittracker.app`
- In Railway: Settings → Domains → Add custom domain
- Point DNS to Railway

---

## Phase 5: Going Live

### Pre-Launch Checklist

```
[ ] Frontend deployed to Vercel ✅
[ ] Backend deployed to Railway ✅
[ ] Database created and schema applied ✅
[ ] Domain connected ✅
[ ] SSL certificate issued ✅
[ ] Environment variables set ✅
[ ] TikTok API approved ✅
[ ] Meta API approved ✅
[ ] Clerk authentication working ✅
[ ] Test OAuth flows (TikTok, Meta) ✅
[ ] Test data aggregation ✅
[ ] Test dashboard loading ✅
```

### Testing Production

**Step 1: Create test account**
- Go to https://profittracker.app
- Sign up with test email
- Verify email works

**Step 2: Connect test accounts**
- Connect TikTok (use sandbox if available)
- Connect Meta (use test ad account)
- Enter PostHog API key

**Step 3: Verify data flow**
- Click "Refresh Data"
- Check metrics load
- Verify profit calculations

**Step 4: Monitor logs**
- Railway: View Logs tab
- Vercel: View Functions tab
- Look for errors

---

### Post-Launch Monitoring

**Set up error tracking (optional but recommended):**

1. **Sentry.io (Free tier)**

```bash
npm install @sentry/nextjs
```

Add to `frontend/sentry.client.config.js`:

```javascript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'your-sentry-dsn',
  tracesSampleRate: 1.0,
});
```

2. **Analytics (optional)**

```bash
npm install @vercel/analytics
```

Add to `frontend/app/layout.tsx`:

```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## Using Cursor for Development

### Tips for Building with Cursor

**1. Use AI Chat for Code Generation**

In Cursor chat:
```
Create a React component for displaying country profit metrics with:
- Country flag emoji
- Revenue, spend, profit
- ROAS indicator
- Green for profit, red for loss
- Tailwind CSS styling
```

Cursor will generate the component for you!

**2. Use Composer for Multi-File Changes**

Open Composer (Cmd+I):
```
Add TikTok OAuth flow:
1. Create /auth/tiktok route in backend
2. Handle OAuth callback
3. Store access token in database
4. Create connect button in frontend
```

Cursor will modify multiple files at once.

**3. Use @ Mentions for Context**

```
@database.js Add a function to save TikTok access token for a user
```

Cursor will use your database file as context.

**4. Use Inline Chat for Quick Edits**

Select code, press Cmd+K:
```
Add error handling and loading states
```

---

## Troubleshooting

### Common Issues

#### Backend won't start

**Error:** `Cannot find module 'express'`

**Fix:**
```bash
cd backend
npm install
```

---

#### Database connection failed

**Error:** `Connection refused to PostgreSQL`

**Fix:**
1. Check `DATABASE_URL` in `.env`
2. Verify Railway database is running
3. Check SSL settings:

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false  // Important for Railway!
  }
});
```

---

#### CORS error in browser

**Error:** `Access to fetch blocked by CORS policy`

**Fix:** Update `backend/server.js`:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://profittracker.app',
    'https://profit-tracker-frontend.vercel.app'
  ],
  credentials: true
}));
```

---

#### OAuth redirect not working

**Error:** `redirect_uri mismatch`

**Fix:**
1. Check TikTok/Meta app settings
2. Add callback URLs:
   - Development: `http://localhost:4000/auth/tiktok/callback`
   - Production: `https://your-backend.railway.app/auth/tiktok/callback`

---

#### Frontend shows "Failed to fetch"

**Fix:**
1. Check `NEXT_PUBLIC_API_URL` in Vercel environment variables
2. Verify backend is running: visit `https://your-backend.railway.app/health`
3. Check browser console for detailed error

---

## Cost Breakdown

### Monthly Costs (Until First Paying Customers)

| Service | Plan | Cost | What For |
|---------|------|------|----------|
| **Vercel** | Free | $0 | Frontend hosting |
| **Railway** | Hobby | $5 | Backend + PostgreSQL |
| **Clerk** | Free | $0 | Auth (<10k users) |
| **Domain** | Annual | ~$1/mo | profittracker.app |
| **Total** | | **~$6/mo** | |

### After First Customers

When you have 100 paying customers at $49/mo = $4,900 MRR:

| Service | Plan | Cost |
|---------|------|------|
| Railway | Pro | $20/mo |
| Clerk | Pro | $25/mo |
| Domain | | $1/mo |
| **Total** | | **$46/mo** |
| **Profit** | | **$4,854/mo** |

---

## Next Steps

1. **Week 1-3:** Build MVP following this guide
2. **Week 4:** Deploy to production
3. **Week 5:** Create landing page + waitlist
4. **Week 6:** Launch on Twitter/IndieHackers
5. **Week 7-8:** Get first 10 beta users
6. **Month 3:** First paying customers

---

**You're ready to build! Start with Phase 1 and use Cursor to help you code each section.**

Good luck! 🚀

---

*Last updated: 2026-02-12*
