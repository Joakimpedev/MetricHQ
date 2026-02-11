# Profit Tracker - CLI setup (Railway Postgres, schema, then run)
# Run from repo root: .\scripts\setup.ps1
# Or: pwsh -File scripts\setup.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root "backend\package.json"))) {
    Write-Error "Run from repo root or ensure backend/ exists. Current script dir: $PSScriptRoot"
    exit 1
}
Set-Location $root

Write-Host "`n=== 1. Railway login (complete in browser) ===" -ForegroundColor Cyan
npx -y @railway/cli login
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== 2. Create project and add PostgreSQL ===" -ForegroundColor Cyan
if (-not (Test-Path ".railway")) {
    npx -y @railway/cli init -n profit-tracker
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
npx -y @railway/cli add -d postgres
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nWaiting 15s for Postgres to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host "`n=== 3. Write DATABASE_URL to backend/.env (use public URL for local) ===" -ForegroundColor Cyan
Set-Location $root
npx -y @railway/cli run node backend/scripts/write-database-url.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nIf the script said DATABASE_URL is internal only:" -ForegroundColor Yellow
    Write-Host "  1. Go to https://railway.app → your project → Postgres service"
    Write-Host "  2. Open Variables (or Connect) and copy the *public* connection URL"
    Write-Host "     (host should be like *.proxy.rlwy.net or *.railway.app, NOT postgres.railway.internal)"
    Write-Host "  3. Put it in backend/.env as: DATABASE_URL=<that-url>"
    Write-Host "  4. Run from backend: npm run db:schema"
    exit $LASTEXITCODE
}

Write-Host "`n=== 4. Run database schema ===" -ForegroundColor Cyan
Set-Location (Join-Path $root "backend")
npm run db:schema
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Set-Location $root
Write-Host "`n=== 5. Clerk (manual) ===" -ForegroundColor Cyan
Write-Host "1. Open https://clerk.com and create an application (e.g. Email + Google)."
Write-Host "2. Copy Publishable key and Secret key from the dashboard."
Write-Host "3. Put them in frontend/.env.local:"
Write-Host "   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_..."
Write-Host "   CLERK_SECRET_KEY=sk_test_..."
Write-Host ""

Write-Host "=== 6. Run and test ===" -ForegroundColor Cyan
Write-Host "Terminal 1 (backend):  cd backend; npm run dev"
Write-Host "Terminal 2 (frontend): cd frontend; npm run dev"
Write-Host "Then open http://localhost:3000"
Write-Host ""
