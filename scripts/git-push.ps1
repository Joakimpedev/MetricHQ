# Profit Tracker - Push to GitHub (deployment prep)
# Run from repo root: .\scripts\git-push.ps1
# Optional: .\scripts\git-push.ps1 -RemoteUrl "https://github.com/YOUR_USERNAME/profit-tracker.git"

param(
    [string]$RemoteUrl = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root "backend\package.json")) -or -not (Test-Path (Join-Path $root "frontend\package.json"))) {
    Write-Error "Run from repo root (parent of scripts/). Current script dir: $PSScriptRoot"
    exit 1
}
Set-Location $root

# Init if needed
if (-not (Test-Path ".git")) {
    git init
    git add .
    git commit -m "Prepare deployment: backend, frontend, env templates, Railway/Vercel config"
    git branch -M main
} else {
    git add .
    $status = git status --porcelain
    if ($status) {
        git commit -m "Prepare deployment: env templates, config, git push script"
    }
}

if ($RemoteUrl) {
    $exists = git remote get-url origin 2>$null
    if (-not $exists) {
        git remote add origin $RemoteUrl
    } else {
        git remote set-url origin $RemoteUrl
    }
    git push -u origin main
} else {
    Write-Host "`nGit repo ready. To push to GitHub:" -ForegroundColor Cyan
    Write-Host "  1. Create a new repository on GitHub (e.g. profit-tracker)."
    Write-Host "  2. Run one of:"
    Write-Host "     git remote add origin https://github.com/YOUR_USERNAME/profit-tracker.git"
    Write-Host "     git push -u origin main"
    Write-Host ""
    Write-Host "  Or run this script with the repo URL:"
    Write-Host "     .\scripts\git-push.ps1 -RemoteUrl ""https://github.com/YOUR_USERNAME/profit-tracker.git"""
    Write-Host ""
}
