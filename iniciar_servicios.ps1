<#
.SYNOPSIS
  Levanta la plataforma completa en local (Windows PowerShell 5.1+):
  Auth 8081, Cursos 8082, Pedidos 8083, Comprobantes 8084, WhatsApp 8085, Gateway 8080, Angular 4200.

.DESCRIPTION
  - Base de datos (Supabase u otra PostgreSQL) por variables de entorno; la contrasena se pide sin eco
    y solo vive en la memoria de los procesos lanzados (nunca se escribe en archivos).
  - SPRING_JPA_HIBERNATE_DDL_AUTO=none: no se ejecutan migraciones ni cambios de esquema.
  - Verifica dependencias y puertos libres antes de iniciar (no crea ventanas duplicadas).
  - Registra los PID lanzados en .run\pids.json para que detener_servicios.ps1 detenga SOLO esos procesos.
  - Integraciones externas (Mercado Pago, SMTP, Meta, WhatsApp QR) quedan desactivadas salvo que
    sus variables ya esten definidas en la sesion (ver .env.example).

.EXAMPLE
  $env:DB_URL = "jdbc:postgresql://<host>:5432/postgres?sslmode=require"
  $env:DB_USERNAME = "postgres.<ref-proyecto>"
  .\iniciar_servicios.ps1
#>
[CmdletBinding()]
param(
    [string]$DbUrl = $env:DB_URL,
    [string]$DbUsername = $env:DB_USERNAME,
    [switch]$SinFrontend
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$runDir = Join-Path $root '.run'
$logDir = Join-Path $runDir 'logs'
$pidFile = Join-Path $runDir 'pids.json'

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Fail($msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

# --- 1. Procesos previos del proyecto -----------------------------------------------------------
if (Test-Path $pidFile) {
    $previos = @(Get-Content $pidFile -Raw | ConvertFrom-Json) | Where-Object { Get-Process -Id $_.pid -ErrorAction SilentlyContinue }
    if ($previos.Count -gt 0) {
        Fail "Ya hay servicios del proyecto en ejecucion ($($previos.name -join ', ')). Ejecuta .\detener_servicios.ps1 primero."
    }
}

# --- 2. Dependencias ---------------------------------------------------------------------------
Write-Step 'Verificando dependencias'
foreach ($cmd in 'java', 'node', 'npm', 'python') {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { Fail "No se encontro '$cmd' en el PATH." }
}
& python -c "import fastapi, uvicorn, reportlab" 2>$null
if ($LASTEXITCODE -ne 0) { Fail "Faltan dependencias Python: pip install -r comprobantes-service\requirements.txt" }
if (-not (Test-Path (Join-Path $root 'whatsapp-service\node_modules'))) { Fail "Falta whatsapp-service\node_modules: cd whatsapp-service; npm ci" }
if (-not $SinFrontend -and -not (Test-Path (Join-Path $root 'frontend\node_modules'))) { Fail "Falta frontend\node_modules: cd frontend; npm ci" }

# --- 3. Puertos libres -------------------------------------------------------------------------
Write-Step 'Verificando puertos'
$puertos = @(8080, 8081, 8082, 8083, 8084, 8085)
if (-not $SinFrontend) { $puertos += 4200 }
$ocupados = @()
foreach ($p in $puertos) {
    $c = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($c) { $ocupados += "$p (PID $($c.OwningProcess))" }
}
if ($ocupados.Count -gt 0) { Fail "Puertos ocupados: $($ocupados -join ', '). Liberalos antes de iniciar." }

# --- 4. Configuracion de base de datos y secretos (solo en memoria) ----------------------------
Write-Step 'Configuracion de base de datos'
if (-not $DbUrl) { $DbUrl = Read-Host 'JDBC URL (ej. jdbc:postgresql://<host>:5432/postgres?sslmode=require)' }
if (-not $DbUsername) { $DbUsername = Read-Host 'Usuario de base de datos' }
$secure = Read-Host 'Contrasena de base de datos (no se mostrara)' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $dbPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
if (-not $dbPassword) { Fail 'La contrasena no puede estar vacia.' }

$env:DB_URL = $DbUrl; $env:SPRING_DATASOURCE_URL = $DbUrl
$env:DB_USERNAME = $DbUsername; $env:SPRING_DATASOURCE_USERNAME = $DbUsername
$env:DB_PASSWORD = $dbPassword; $env:SPRING_DATASOURCE_PASSWORD = $dbPassword
$env:SPRING_JPA_HIBERNATE_DDL_AUTO = 'none'
$env:SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE = '3'

# JWT_SECRET compartido por auth/cursos/pedidos/gateway. Si no se define, se genera uno aleatorio
# para esta sesion (los tokens emitidos dejan de valer al reiniciar).
if (-not $env:JWT_SECRET -or $env:JWT_SECRET.Length -lt 32) {
    $bytes = New-Object byte[] 48
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $env:JWT_SECRET = [Convert]::ToBase64String($bytes)
    Write-Host '    JWT_SECRET generado aleatoriamente para esta sesion.' -ForegroundColor DarkGray
}

# --- 5. Arranque --------------------------------------------------------------------------------
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$servicios = @(
    @{ name = 'auth';         port = 8081; dir = $root; file = 'cmd.exe'; args = '/c mvnw.cmd -q -pl auth-service spring-boot:run' },
    @{ name = 'cursos';       port = 8082; dir = $root; file = 'cmd.exe'; args = '/c mvnw.cmd -q -pl cursos-service spring-boot:run' },
    @{ name = 'pedidos';      port = 8083; dir = $root; file = 'cmd.exe'; args = '/c mvnw.cmd -q -pl pedidos-service spring-boot:run' },
    @{ name = 'comprobantes'; port = 8084; dir = (Join-Path $root 'comprobantes-service'); file = 'python'; args = '-m uvicorn app.main:app --host 127.0.0.1 --port 8084' },
    @{ name = 'whatsapp';     port = 8085; dir = (Join-Path $root 'whatsapp-service'); file = 'node'; args = 'src/index.js' },
    @{ name = 'gateway';      port = 8080; dir = $root; file = 'cmd.exe'; args = '/c mvnw.cmd -q -pl gateway-service spring-boot:run' }
)
if (-not $SinFrontend) {
    $servicios += @{ name = 'angular'; port = 4200; dir = (Join-Path $root 'frontend'); file = 'cmd.exe'; args = '/c npm start -- --host 127.0.0.1' }
}

$lanzados = @()
try {
    foreach ($s in $servicios) {
        Write-Step "Iniciando $($s.name) ($($s.port))"
        $p = Start-Process -FilePath $s.file -ArgumentList $s.args -WorkingDirectory $s.dir -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput (Join-Path $logDir "$($s.name).log") -RedirectStandardError (Join-Path $logDir "$($s.name).err.log")
        $lanzados += [pscustomobject]@{ name = $s.name; port = $s.port; pid = $p.Id }
        $lanzados | ConvertTo-Json | Set-Content -Encoding utf8 $pidFile
    }
}
finally {
    # Los procesos ya heredaron las variables; se retiran de esta sesion.
    $dbPassword = $null
    Remove-Item Env:DB_PASSWORD, Env:SPRING_DATASOURCE_PASSWORD -ErrorAction SilentlyContinue
}

# --- 6. Espera de puertos ----------------------------------------------------------------------
Write-Step 'Esperando a que los servicios escuchen (max. 180 s)'
$limite = (Get-Date).AddSeconds(180)
do {
    Start-Sleep -Seconds 3
    $pendientes = $lanzados | Where-Object { -not (Get-NetTCPConnection -LocalPort $_.port -State Listen -ErrorAction SilentlyContinue) }
    $caidos = $lanzados | Where-Object { -not (Get-Process -Id $_.pid -ErrorAction SilentlyContinue) }
} while ($pendientes -and -not $caidos -and (Get-Date) -lt $limite)

foreach ($s in $lanzados) {
    $ok = [bool](Get-NetTCPConnection -LocalPort $s.port -State Listen -ErrorAction SilentlyContinue)
    $color = if ($ok) { 'Green' } else { 'Red' }
    $estado = if ($ok) { 'OK' } else { "NO RESPONDE (ver .run\logs\$($s.name).log)" }
    Write-Host ("    {0,-13} {1}  {2}" -f $s.name, $s.port, $estado) -ForegroundColor $color
}
Write-Host ''
Write-Host 'Frontend: http://localhost:4200   Gateway: http://localhost:8080' -ForegroundColor Green
Write-Host 'WhatsApp queda OFFLINE hasta vincular un numero por QR (ver .run\logs\whatsapp.log).' -ForegroundColor Yellow
Write-Host 'Para detener: .\detener_servicios.ps1' -ForegroundColor Green
