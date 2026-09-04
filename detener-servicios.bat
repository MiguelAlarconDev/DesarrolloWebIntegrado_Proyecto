@echo off
title Deteniendo Microservicios
echo ======================================================================
echo           DETENIENDO MICROSERVICIOS (Puertos 8080, 8081, 8082, 8083)
echo ======================================================================

for %%p in (8080 8081 8082 8083) do (
    echo Buscando proceso en puerto %%p...
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%%p "') do (
        echo Cerrando proceso PID %%a en puerto %%p...
        taskkill /f /pid %%a >nul 2>&1
    )
)

echo.
echo ======================================================================
echo   Todos los servicios han sido detenidos correctamente.
echo ======================================================================
pause
