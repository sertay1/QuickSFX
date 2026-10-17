@echo off
setlocal enabledelayedexpansion
title QuickSFX Installer

echo =======================================================
echo                 QuickSFX Installer
echo     Sound Effects Workflow Integration for DaVinci
echo =======================================================
echo.

:: 1. Check for Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    where py >nul 2>nul
    if %errorlevel% neq 0 (
        echo [ERROR] Python was not found on your system!
        echo.
        echo Please download and install Python 3.10+ from:
        echo   https://www.python.org/downloads/
        echo.
        echo NOTE: Make sure to check "Add Python to PATH" during installation.
        echo.
        pause
        exit /b 1
    )
    set PY=py
) else (
    set PY=python
)

echo [1/3] Python found. Checking and installing dependencies...
%PY% -m pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo [INFO] Retrying pip install with full output...
    %PY% -m pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install Python dependencies.
        pause
        exit /b 1
    )
)

echo.
echo [2/3] Installing QuickSFX into DaVinci Resolve...
%PY% install.py
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Installation encountered an error.
    echo If this is a permission error, right-click install.bat and select "Run as administrator".
    pause
    exit /b 1
)

echo.
pause
