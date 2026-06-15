@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0build_web_release.ps1"
pause
