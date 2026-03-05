@echo off
chcp 65001 >nul
echo GitHub 저장소에 푸시하는 스크립트입니다.
echo 원격: https://github.com/apeleba87-star/-.git
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo [오류] Git이 설치되어 있지 않거나 PATH에 없습니다.
  echo https://git-scm.com/download/win 에서 Git for Windows를 설치한 뒤 다시 실행하세요.
  pause
  exit /b 1
)

cd /d "%~dp0"

if not exist .git (
  echo Git 저장소 초기화 중...
  git init
  git add .
  git commit -m "first commit: Newslett project"
  echo.
)

git branch -M main 2>nul
git remote remove origin 2>nul
git remote add origin https://github.com/apeleba87-star/-.git
echo.
echo 푸시 중... (로그인 창이 뜰 수 있습니다)
git push -u origin main

if errorlevel 1 (
  echo.
  echo 푸시 실패. GitHub 로그인/토큰을 확인하세요.
  pause
  exit /b 1
)

echo.
echo 완료. https://github.com/apeleba87-star/- 에서 확인하세요.
pause
