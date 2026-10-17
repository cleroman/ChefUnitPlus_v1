@echo off
title ChefUnitPlus - DEV COMPLET
echo ============================================
echo   CHEFUNITPLUS - ENVIRONNEMENT COMPLET
echo ============================================
echo.
echo 1. Lancement du BACKEND...
start "ChefUnitPlus BACKEND" cmd /k "%~dp0backend\START_BACKEND.bat"

timeout /t 8 /nobreak >nul

echo 2. Lancement du FRONTEND...
start "ChefUnitPlus FRONTEND" cmd /k "%~dp0frontend\START_FRONTEND.bat"

echo.
echo ============================================
echo  DEUX FENETRES OUVERTES :
echo    - BACKEND  : http://localhost:3000
echo    - FRONTEND : Chrome
echo ============================================
echo.
pause
