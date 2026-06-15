# 마감링크 PWA 릴리스 빌드 → repo public/magam/app
$ErrorActionPreference = "Stop"
$env:Path = "C:\proj\flutter\bin;" + $env:Path
Set-Location $PSScriptRoot

if (-not (Test-Path .env)) {
  Write-Host "magam_app/.env 가 없습니다. .env.example 을 복사해 SUPABASE 키를 넣으세요." -ForegroundColor Yellow
}

Push-Location ..
node scripts/build-magam-pwa.mjs
Pop-Location
