@echo off
REM PowerShell 실행 정책 때문에 npm 이 안 될 때: 프로젝트 루트에서 scripts\g2b-ping.cmd 실행
pushd "%~dp0\.."
node "scripts\g2b-ping.mjs"
set EXITCODE=%ERRORLEVEL%
popd
exit /b %EXITCODE%
