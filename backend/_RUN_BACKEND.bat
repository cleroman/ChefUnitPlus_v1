@echo off
title ChefUnitPlus BACKEND - Port 3000
cd /d "C:\Users\asdf\Desktop\ChefUnitPlus_DEV\backend"
echo ============================================================
echo   CHEFUNITPLUS - BACKEND
echo ============================================================
echo.
echo   URL : http://localhost:3000
echo   Pour arreter : Ctrl+C
echo.
echo ============================================================
echo.
node src/server.js
echo.
echo   Backend arrete.
pause
