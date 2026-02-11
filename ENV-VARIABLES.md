# Environment Variables for Deployment

Set these in **Railway** (backend service) and **Vercel** (frontend project). Do not commit real values; use each platform’s **Variables** / **Environment Variables** UI.

---

## Backend (Railway)

Set in: **Railway project → your backend service → Variables**.

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Port (default from Railway). Usually leave unset. |
| `NODE_ENV` | No | Set to `production` for production. |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string. From Railway: add PostgreSQL service and use its `DATABASE_URL` (or copy from Variables). |
| `BACKEND_URL` | **Yes** | Public URL of this backend (e.g. `https://profit-tracker-backend-production.up.railway.app`). Set after first deploy when Railway gives you a domain. |
| `FRONTEND_URL` | **Yes** | Frontend app URL (e.g. `https://profit-tracker.vercel.app`). Used for CORS and OAuth redirects. Set after Vercel deploy. |
| `CLERK_SECRET_KEY` | **Yes** | Clerk secret key (backend). From Clerk dashboard → API Keys. |
| `TIKTOK_APP_ID` | No | TikTok Marketing API app ID (if using TikTok Ads). |
| `TIKTOK_APP_SECRET` | No | TikTok Marketing API app secret. |
| `META_APP_ID` | No | Meta/Facebook app ID (if using Meta Ads). |
| `META_APP_SECRET` | No | Meta/Facebook app secret. |

**Templates:** `backend/.env.example`, `backend/.env.production.example`

---

## Frontend (Vercel)

Set in: **Vercel project → Settings → Environment Variables**. Apply to **Production** (and optionally **Preview**).

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | **Yes** | Backend API URL (same as Railway `BACKEND_URL`, e.g. `https://profit-tracker-backend-production.up.railway.app`). No trailing slash. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Yes** | Clerk publishable key (frontend). From Clerk dashboard → API Keys. |
| `CLERK_SECRET_KEY` | **Yes** | Clerk secret key (needed for server-side auth in Next.js). |

**Templates:** `frontend/.env.production.example`

---

## Summary checklist

**Railway (backend)**  
- [ ] `DATABASE_URL`  
- [ ] `BACKEND_URL` (after first deploy)  
- [ ] `FRONTEND_URL` (after Vercel deploy)  
- [ ] `CLERK_SECRET_KEY`  
- [ ] `TIKTOK_APP_ID` / `TIKTOK_APP_SECRET` (optional)  
- [ ] `META_APP_ID` / `META_APP_SECRET` (optional)  

**Vercel (frontend)**  
- [ ] `NEXT_PUBLIC_API_URL`  
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`  
- [ ] `CLERK_SECRET_KEY`  

**OAuth callbacks (TikTok/Meta app dashboards)**  
- [ ] TikTok: redirect/callback URL = `https://YOUR_RAILWAY_BACKEND_URL/auth/tiktok/callback`  
- [ ] Meta: redirect URI = `https://YOUR_RAILWAY_BACKEND_URL/auth/meta/callback`  

**Clerk dashboard**  
- [ ] Add production frontend URL to allowed origins / redirect URLs.
