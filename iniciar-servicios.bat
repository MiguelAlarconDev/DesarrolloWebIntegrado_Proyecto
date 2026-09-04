@echo off
title Iniciando Microservicios de Plataforma Cursos
echo ======================================================================
echo           INICIANDO PLATAFORMA DE CURSOS VIRTUALES
echo ======================================================================
echo.
echo Revisa que tu base de datos PostgreSQL este activa en el puerto 5432.
echo.

echo [1/4] Levantando Auth Service (Puerto 8081)...
start "Auth-Service (8081)" cmd /k ".\mvnw.cmd spring-boot:run -pl auth-service"

timeout /t 3 /nobreak >nul

echo [2/4] Levantando Cursos Service (Puerto 8082)...
start "Cursos-Service (8082)" cmd /k ".\mvnw.cmd spring-boot:run -pl cursos-service"

timeout /t 3 /nobreak >nul

echo [3/4] Levantando Pedidos Service (Puerto 8083)...
start "Pedidos-Service (8083)" cmd /k ".\mvnw.cmd spring-boot:run -pl pedidos-service"

timeout /t 3 /nobreak >nul

echo [4/4] Levantando Gateway Service (Puerto 8080)...
start "Gateway-Service (8080)" cmd /k ".\mvnw.cmd spring-boot:run -pl gateway-service"

echo.
echo ======================================================================
echo   Los 4 microservicios se estan iniciando en ventanas independientes.
echo   - Gateway:    http://localhost:8080
echo   - Auth:       http://localhost:8081
echo   - Cursos:     http://localhost:8082
echo   - Pedidos:    http://localhost:8083
echo ======================================================================
echo Para detenerlos, puedes cerrar cada ventana o ejecutar detener-servicios.bat
pause
