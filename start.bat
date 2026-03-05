@echo off
cd /d "%~dp0"

echo [Newslett] Starting dev server...
echo.
echo Open in browser: http://localhost:3001
echo.

if exist ".next\dev\lock" (
    del /f /q ".next\dev\lock"
    echo Lock file removed.
    echo.
)

if not exist "node_modules" (
    echo Running npm install...
    call npm install
    echo.
)

call npm run dev

pause
