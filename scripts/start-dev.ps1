# Profit Tracker - Start backend + frontend for local testing
# Run from repo root: .\scripts\start-dev.ps1
# Or: pwsh -File scripts\start-dev.ps1

$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root "backend\package.json"))) {
    Write-Error "Run from repo root. Current dir: $PSScriptRoot"
    exit 1
}

Write-Host "`nStarting Profit Tracker..." -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:4000" -ForegroundColor Gray
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Gray
Write-Host ""

# Start backend in new window
$backendCmd = "Set-Location '$root\backend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

# Start frontend in new window
$frontendCmd = "Set-Location '$root\frontend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

# Wait for servers to start
Write-Host "Waiting for servers to start (8 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Open browser
Write-Host "Opening http://localhost:3000" -ForegroundColor Green
Start-Process "http://localhost:3000"
