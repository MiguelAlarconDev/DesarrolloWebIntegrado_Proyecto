@echo off
echo ==========================================================
echo    Iniciando Plataforma de Gestion y Venta de Cursos
echo ==========================================================
cd /d "%~dp0"

echo 1. Iniciando Auth Service (Puerto 8081)...
start "1. Auth Service (8081)" cmd /k "title 1. Auth Service (8081) && mvnw.cmd -pl auth-service spring-boot:run"

echo 2. Iniciando Cursos Service (Puerto 8082)...
start "2. Cursos Service (8082)" cmd /k "title 2. Cursos Service (8082) && mvnw.cmd -pl cursos-service spring-boot:run"

echo 3. Iniciando Pedidos Service (Puerto 8083)...
start "3. Pedidos Service (8083)" cmd /k "title 3. Pedidos Service (8083) && mvnw.cmd -pl pedidos-service spring-boot:run"

echo 4. Iniciando API Gateway (Puerto 8080)...
start "4. API Gateway (8080)" cmd /k "title 4. API Gateway (8080) && mvnw.cmd -pl gateway-service spring-boot:run"

echo 5. Iniciando Frontend Web (Puerto 3000)...
start "5. Frontend Web (3000)" cmd /k "title 5. Frontend Web (3000) && py frontend_server.py"

echo.
echo Todos los servicios estan siendo iniciados en ventanas independientes.
echo Frontend Web: http://localhost:3000
echo API Gateway:  http://localhost:8080
