# Phase 2 Week 4: Deploy to Production

This checklist walks you through deploying Profit Tracker to **Railway** (backend + DB) and **Vercel** (frontend). You can use **one GitHub repo** (this repo) with two services pointing at different roots.

---

## Before you start

- [ ] Phase 1 and Phase 2 Weeks 1–3 are done (DB schema applied, Clerk, TikTok/Meta OAuth, PostHog, aggregator).
- [ ] You have: GitHub account, Railway account, Vercel account, Clerk (production keys when ready).
- [ ] Code is in a GitHub repo (this folder pushed as the root).

---

## Part 1: Deploy backend to Railway

### 1.1 Push code to GitHub

From the project root (`Profit-tracker`):

```powershell
git init
git add .
git commit -m "Phase 2 Week 4: ready for deploy"
git branch -M main
# Create a new repo on GitHub (e.g. yourusername/profit-tracker), then:
git remote add origin https://github.com/YOUR_USERNAME/profit-tracker.git
git push -u origin main
```

### 1.2 Create Railway project and PostgreSQL

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. **New Project** → **Provision PostgreSQL**.
3. Click the PostgreSQL service → **Variables** → copy `DATABASE_URL` (Railway often adds it automatically to the project).

### 1.3 Deploy the backend service

1. In the same (or same team) Railway project: **New** → **GitHub Repo** → select your `profit-tracker` repo.
2. Railway adds a new service. Select it → **Settings**:
   - **Root Directory**: set to `backend`.
   - **Build Command**: leave default or `npm install`.
   - **Start Command**: leave default so it runs `npm start` (which runs `node server.js`).
3. **Variables** (add these; use the same names as in `backend/.env.example`):

   | Variable          | Value / notes |
   |-------------------|---------------|
   | `DATABASE_URL`    | From PostgreSQL service (or paste from Variables tab). |
   | `NODE_ENV`       | `production` |
   | `BACKEND_URL`    | **Leave empty for now.** After first deploy, Railway gives you a URL; then set it here (e.g. `https://profit-tracker-backend-production.up.railway.app`). |
   | `FRONTEND_URL`   | **Leave empty for now.** Set after Part 2 to your Vercel URL (e.g. `https://profit-tracker.vercel.app`). |
   | `CLERK_SECRET_KEY` | From Clerk dashboard (backend key). |
   | `TIKTOK_APP_ID`  | If using TikTok OAuth. |
   | `TIKTOK_APP_SECRET` | If using TikTok OAuth. |
   | `META_APP_ID`    | If using Meta OAuth. |
   | `META_APP_SECRET` | If using Meta OAuth. |

4. **Deploy**: Railway builds and deploys. Open the **Settings** → **Networking** → **Generate Domain** to get the backend URL.
5. Set **`BACKEND_URL`** (and optionally **`FRONTEND_URL`** if you already have the Vercel URL) in Variables, then redeploy if needed.
6. Test: open `https://YOUR_RAILWAY_URL/health` in a browser. You should see: `{"status":"ok","message":"Backend running!"}`.

---

## Part 2: Deploy frontend to Vercel

### 2.1 Import project in Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. **Add New** → **Project** → import your `profit-tracker` repo.
3. **Configure**:
   - **Root Directory**: set to `frontend` (not the repo root).
   - Framework: Next.js (auto-detected).
   - Build / output settings: leave default.

### 2.2 Set environment variables

In the project → **Settings** → **Environment Variables**, add (for **Production**; add for Preview if you want):

| Name                                  | Value |
|---------------------------------------|--------|
| `NEXT_PUBLIC_API_URL`                 | Your Railway backend URL (e.g. `https://profit-tracker-backend-production.up.railway.app`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`   | From Clerk (frontend publishable key). |
| `CLERK_SECRET_KEY`                    | From Clerk (backend secret key). |

You can copy the list from `frontend/.env.production.example`.

### 2.3 Deploy

Click **Deploy**. When it’s done, note the URL (e.g. `https://profit-tracker-xxx.vercel.app`).

### 2.4 Wire backend to frontend

1. In **Railway** (backend service): set **`FRONTEND_URL`** to your Vercel URL (e.g. `https://profit-tracker-xxx.vercel.app`). Redeploy if needed.
2. In **Clerk**: add your Vercel URL to allowed origins / redirect URLs so sign-in and callbacks work.

---

## Part 3: OAuth and API callbacks

- **TikTok / Meta apps**: In each app’s settings, set the OAuth redirect/callback URL to:
  - `https://YOUR_RAILWAY_BACKEND_URL/auth/tiktok/callback`
  - `https://YOUR_RAILWAY_BACKEND_URL/auth/meta/callback`
- This avoids “redirect_uri mismatch” in production.

---

## Quick checklist

- [ ] Repo pushed to GitHub.
- [ ] Railway: PostgreSQL provisioned, backend service deployed from `backend` root.
- [ ] Railway: `DATABASE_URL`, `BACKEND_URL`, `FRONTEND_URL`, `CLERK_SECRET_KEY` (and TikTok/Meta if used) set.
- [ ] Backend `/health` returns OK.
- [ ] Vercel: frontend deployed from `frontend` root.
- [ ] Vercel: `NEXT_PUBLIC_API_URL`, Clerk keys set.
- [ ] Railway `FRONTEND_URL` set to Vercel URL.
- [ ] Clerk and TikTok/Meta app callbacks updated for production URLs.
- [ ] Sign in and “Refresh Data” tested on the live frontend.

For more detail (domain, DNS, Post-launch), see **Phase 3, 4, and 5** in `BUILD-AND-DEPLOY-GUIDE.md`.
