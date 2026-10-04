@echo off
title Sistema Completo CursosPro (Fullstack)
echo ========================================================
echo   Iniciando Sistema Completo CursosPro (Backend + Frontend)
echo ========================================================
echo.
call iniciar-backend.bat
echo.
echo Esperando a que los microservicios Spring Boot inicien sus conexiones (aprox. 15s)...
timeout /t 15 /nobreak >nul
echo.
echo Iniciando interfaz de usuario en http://localhost:4200...
call iniciar-frontend.bat
