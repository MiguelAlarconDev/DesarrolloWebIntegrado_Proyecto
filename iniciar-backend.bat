@echo off
title Lanzador de Microservicios Backend - CursosPro
echo ========================================================
echo   Iniciando Microservicios Backend CursosPro
echo ========================================================
echo.
echo Verificando que PostgreSQL este activo en localhost:5433 con BD 'cursos_db'...
echo.

cd /d "%~dp0"

echo [1/5] Levantando Gateway Service (Puerto 8080)...
start "1. Gateway Service (8080)" cmd /k call mvnw.cmd spring-boot:run -pl gateway-service

ping -n 3 127.0.0.1 >nul

echo [2/5] Levantando Auth Service (Puerto 8081)...
start "2. Auth Service (8081)" cmd /k call mvnw.cmd spring-boot:run -pl auth-service

ping -n 3 127.0.0.1 >nul

echo [3/5] Levantando Cursos Service (Puerto 8082)...
start "3. Cursos Service (8082)" cmd /k call mvnw.cmd spring-boot:run -pl cursos-service

ping -n 3 127.0.0.1 >nul

echo [4/5] Levantando Pedidos Service (Puerto 8083)...
start "4. Pedidos Service (8083)" cmd /k call mvnw.cmd spring-boot:run -pl pedidos-service

ping -n 3 127.0.0.1 >nul

echo [5/5] Levantando Comprobantes Service (Python FastAPI - Puerto 8084)...
if exist "comprobantes-service\.venv\Scripts\python.exe" (
    start "5. Comprobantes Service (8084)" cmd /k "cd comprobantes-service && .venv\Scripts\python.exe -m uvicorn app.main:app --port 8084 --reload"
) else (
    start "5. Comprobantes Service (8084)" cmd /k "cd comprobantes-service && py -m uvicorn app.main:app --port 8084 --reload"
)

echo.
echo ========================================================
echo   Backend lanzado exitosamente en terminales individuales.
echo   La API principal esta disponible en http://localhost:8080/api
echo ========================================================
