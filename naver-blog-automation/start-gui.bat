@echo off
chcp 65001 > nul
title 네이버 블로그 자동화 GUI

cd /d "%~dp0"

:: Node.js PATH 보정
set PATH=%PATH%;C:\Program Files\nodejs

echo ========================================
echo   Blog Automation GUI 시작 중...
echo   http://localhost:3000
echo ========================================
echo.

:: 서버 시작 후 3초 뒤 브라우저 자동 오픈
start /b cmd /c "timeout /t 3 /nobreak > nul && start http://localhost:3000"

npm run gui

pause
