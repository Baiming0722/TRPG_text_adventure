@echo off
title TRPG Adventure Engine - Setup
echo ==========================================
echo   TRPG Adventure Engine - Setup
echo ==========================================
echo.

set "NODE_EXE=%~dp0runtime\node.exe"

if exist "%NODE_EXE%" (
    echo [OK] Node.js portable already exists.
    "%NODE_EXE%" --version
    echo.
    echo Run start.bat to launch the game.
    pause
    exit /b 0
)

echo Downloading and installing portable Node.js...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup_helper.ps1"

if errorlevel 1 (
    echo.
    echo Setup failed!
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   Setup Complete!
echo ==========================================
echo.

if exist "%NODE_EXE%" (
    echo Node.js version:
    "%NODE_EXE%" --version
)

echo.
echo Run start.bat to launch the game.
echo.
pause
