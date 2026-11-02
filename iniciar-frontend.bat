@echo off
title Frontend Angular 22 - CursosPro
echo ========================================================
echo   Iniciando Frontend Angular 22
echo ========================================================

set "TARGET_DIR=C:\dev\cursos-frontend"
set "SRC_DIR=%~dp0..\frontedangularsis"
if not exist "%SRC_DIR%" set "SRC_DIR=%~dp0frontend"

echo Sincronizando codigo fuente desde %SRC_DIR%...
powershell -NoProfile -Command "Copy-Item -Path '%SRC_DIR%\src\*' -Destination '%TARGET_DIR%\src' -Recurse -Force; Copy-Item -Path '%SRC_DIR%\public\*' -Destination '%TARGET_DIR%\public' -Recurse -Force; Copy-Item -Path '%SRC_DIR%\angular.json' -Destination '%TARGET_DIR%\' -Force; Copy-Item -Path '%SRC_DIR%\package.json' -Destination '%TARGET_DIR%\' -Force; Copy-Item -Path '%SRC_DIR%\tsconfig*.json' -Destination '%TARGET_DIR%\' -Force"

cd /d "%TARGET_DIR%"
set NG_CLI_ANALYTICS=false
echo.
echo ========================================================
echo   Servidor iniciado en http://localhost:4200
echo ========================================================
call npx ng serve --open
