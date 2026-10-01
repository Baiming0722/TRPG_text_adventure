@echo off
title TRPG Adventure Engine Server
echo ==========================================
echo   TRPG Adventure Engine - Startup
echo ==========================================

set "NODE_CMD=%~dp0runtime\node.exe"
if not exist "%NODE_CMD%" (
    where node >nul 2>&1
    if errorlevel 1 (
        echo.
        echo [ERROR] Node.js not found!
        echo         Please run setup.bat first.
        echo.
        pause
        exit /b 1
    )
    set "NODE_CMD=node"
    echo [INFO] Using system Node.js
) else (
    echo [INFO] Using portable Node.js
)

echo [1/3] Checking port 8080...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING') do (
    taskkill /f /pid %%a 2>nul
)

echo [2/3] Starting server...
start /b "" "%NODE_CMD%" "%~dp0server.js"

echo [3/3] Launching browser...
timeout /t 2 /nobreak >nul
start http://localhost:8080

echo.
echo ------------------------------------------
echo Server started successfully!
echo Game: http://localhost:8080
echo Debug: http://localhost:8080/debug.html
echo ------------------------------------------
pause
