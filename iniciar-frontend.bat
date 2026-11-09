@echo off
title Frontend Angular 22 - CursosPro
echo ========================================================
echo   Iniciando Frontend Angular 22
echo ========================================================

cd /d "%~dp0frontend"
set NG_CLI_ANALYTICS=false
echo.
echo ========================================================
echo   Servidor iniciado en http://localhost:4200
echo ========================================================
call npx ng serve --open
