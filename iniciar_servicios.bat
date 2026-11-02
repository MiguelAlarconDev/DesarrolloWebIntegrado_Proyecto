@echo off
echo ==========================================================
echo    Iniciando Plataforma de Gestion y Venta de Cursos
echo ==========================================================
cd /d "%~dp0"
set DB_URL=jdbc:postgresql://localhost:5433/cursos_db
set DB_PASSWORD=Joseelmer

echo 1. Iniciando Auth Service (Puerto 8081)...
start "1. Auth Service (8081)" cmd /k "title 1. Auth Service (8081) && mvnw.cmd -pl auth-service spring-boot:run"

echo 2. Iniciando Cursos Service (Puerto 8082)...
start "2. Cursos Service (8082)" cmd /k "title 2. Cursos Service (8082) && mvnw.cmd -pl cursos-service spring-boot:run"

echo 3. Iniciando Pedidos Service (Puerto 8083)...
start "3. Pedidos Service (8083)" cmd /k "title 3. Pedidos Service (8083) && mvnw.cmd -pl pedidos-service spring-boot:run"

echo 4. Iniciando API Gateway (Puerto 8080)...
start "4. API Gateway (8080)" cmd /k "title 4. API Gateway (8080) && mvnw.cmd -pl gateway-service spring-boot:run"

echo 5. Iniciando Frontend Angular (Puerto 4200)...
start "5. Frontend Angular (4200)" cmd /k "title 5. Frontend Angular (4200) && cd frontend && npm start"

echo.
echo Todos los servicios estan siendo iniciados en ventanas independientes.
echo Frontend Angular: http://localhost:4200
echo API Gateway:      http://localhost:8080
