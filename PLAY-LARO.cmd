@echo off
cd /d "%~dp0"
title LARO - Barangay Days
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 24 LTS is required to run LARO.
  pause
  exit /b 1
)
if not exist "node_modules\vite\package.json" (
  echo Install dependencies first: npm.cmd ci
  pause
  exit /b 1
)
call npm.cmd run build
if errorlevel 1 (
  echo The build did not finish. Please check the error above.
  pause
  exit /b 1
)
call npm.cmd run play
pause
