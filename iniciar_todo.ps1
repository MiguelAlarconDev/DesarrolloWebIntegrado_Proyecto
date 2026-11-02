$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Iniciando CursosPro Fullstack (Microservicios + Angular) " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Gateway (8080)
Write-Host "[1/6] Levantando Gateway Service (Puerto 8080)..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k mvnw.cmd -pl gateway-service spring-boot:run" -WorkingDirectory $root

Start-Sleep -Seconds 2

# 2. Auth Service (8081)
Write-Host "[2/6] Levantando Auth Service (Puerto 8081)..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k mvnw.cmd -pl auth-service spring-boot:run" -WorkingDirectory $root

Start-Sleep -Seconds 2

# 3. Cursos Service (8082)
Write-Host "[3/6] Levantando Cursos Service (Puerto 8082)..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k mvnw.cmd -pl cursos-service spring-boot:run" -WorkingDirectory $root

Start-Sleep -Seconds 2

# 4. Pedidos Service (8083)
Write-Host "[4/6] Levantando Pedidos Service (Puerto 8083)..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k mvnw.cmd -pl pedidos-service spring-boot:run" -WorkingDirectory $root

Start-Sleep -Seconds 2

# 5. Comprobantes Service (8084)
Write-Host "[5/6] Levantando Comprobantes Service (Python FastAPI - Puerto 8084)..." -ForegroundColor Green
$comprobantesDir = Join-Path $root "comprobantes-service"
Start-Process cmd.exe -ArgumentList "/k py -m uvicorn app.main:app --port 8084 --reload" -WorkingDirectory $comprobantesDir

Start-Sleep -Seconds 2

# 6. Frontend Angular (4200)
Write-Host "[6/6] Levantando Frontend Angular (Puerto 4200)..." -ForegroundColor Green
$targetDir = "C:\dev\cursos-frontend"
$srcDir = Join-Path $root "..\frontedangularsis"
if (-not (Test-Path $srcDir)) { $srcDir = Join-Path $root "frontend" }

Copy-Item -Path "$srcDir\src\*" -Destination "$targetDir\src" -Recurse -Force
Copy-Item -Path "$srcDir\public\*" -Destination "$targetDir\public" -Recurse -Force
Copy-Item -Path "$srcDir\angular.json" -Destination "$targetDir\" -Force
Copy-Item -Path "$srcDir\package.json" -Destination "$targetDir\" -Force
Copy-Item -Path "$srcDir\tsconfig*.json" -Destination "$targetDir\" -Force

Start-Process cmd.exe -ArgumentList "/k set NG_CLI_ANALYTICS=false && npx ng serve --open" -WorkingDirectory $targetDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Todos los servicios se estan ejecutando en ventanas independientes." -ForegroundColor Cyan
Write-Host "  Frontend Angular: http://localhost:4200" -ForegroundColor Yellow
Write-Host "  API Gateway:      http://localhost:8080" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
