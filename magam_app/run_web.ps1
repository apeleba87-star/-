# 마감 앱 웹 개발 — 포트 54222 고정 (Supabase Redirect URL 과 맞출 것)
# PowerShell 정책 오류 시: run_web.bat 사용 또는
#   powershell -ExecutionPolicy Bypass -File .\run_web.ps1
$ErrorActionPreference = "Stop"
$env:Path = "C:\proj\flutter\bin;" + $env:Path
Set-Location $PSScriptRoot
flutter run -d chrome --web-hostname=localhost --web-port=54222 --dart-define=MAGAM_SHARE_BASE_URL=https://cleanidex.co.kr
