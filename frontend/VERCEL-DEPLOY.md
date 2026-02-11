# Vercel 404 NOT_FOUND – Fix

If you see **404 NOT_FOUND** (e.g. `Code: NOT_FOUND`, `ID: sin1::...`) after deploying:

## 1. Set Root Directory to `frontend`

Vercel must build the **Next.js app**, not the repo root.

1. Open [Vercel Dashboard](https://vercel.com/dashboard) → your project.
2. **Settings** → **General**.
3. Under **Root Directory**, click **Edit**.
4. Enter: **`frontend`** (no leading/trailing slash).
5. Save.
6. Go to **Deployments** → open the **⋯** on the latest deployment → **Redeploy**.

## 2. Check the build

- **Deployments** → click the latest deployment → **Building** / **Logs**.
- If the build **fails**, the site can show 404 or an error page. Fix the error (e.g. missing env var, TypeScript error) and redeploy.
- Confirm the build runs from the `frontend` folder (you should see `next build` or similar in the logs).

## 3. Confirm structure

From the **repo root**, the app must live under `frontend/`:

```
frontend/
  app/
    layout.tsx
    page.tsx
    globals.css
  package.json
  next.config.ts
```

With **Root Directory** = `frontend`, Vercel will detect Next.js and build correctly.
