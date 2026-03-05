# Newslett 개발 서버 시작
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "[Newslett] 개발 서버 시작 중..." -ForegroundColor Cyan
Write-Host ""

$lockPath = ".next\dev\lock"
if (Test-Path $lockPath) {
    Remove-Item $lockPath -Force
    Write-Host "이전 락 파일 제거됨." -ForegroundColor Yellow
    Write-Host ""
}

if (-not (Test-Path "node_modules")) {
    Write-Host "node_modules 없음. npm install 실행..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

npm run dev
