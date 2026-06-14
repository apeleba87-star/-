@echo off
setlocal
set "PATH=C:\proj\flutter\bin;%PATH%"
cd /d "%~dp0"
flutter run -d chrome --web-hostname=localhost --web-port=54222 --dart-define=MAGAM_SHARE_BASE_URL=https://cleanidex.co.kr
