@echo off
title Sistema Completo CursosPro (Fullstack)
echo ========================================================
echo   Iniciando Sistema Completo CursosPro (Backend + Frontend)
echo ========================================================
echo.
call iniciar-backend.bat
timeout /t 5 /nobreak >nul
echo.
echo Iniciando interfaz de usuario...
call iniciar-frontend.bat
