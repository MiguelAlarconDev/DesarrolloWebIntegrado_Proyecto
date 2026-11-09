<#
.SYNOPSIS
  Levanta la plataforma completa en local (Windows PowerShell 5.1+):
  Auth 8081, Cursos 8082, Pedidos 8083, Comprobantes 8084, WhatsApp 8085, Gateway 8080, Angular 4200.

.DESCRIPTION
  - Configuracion: si existe un archivo .env privado en la raiz del repositorio (ignorado por Git), se
    carga automaticamente. Las variables YA definidas en el entorno tienen prioridad sobre el .env.
    Sin .env se mantiene el modo interactivo (URL, usuario y contrasena sin eco).
  - Nunca se imprimen valores de variables: solo nombres y conteos.
  - SPRING_JPA_HIBERNATE_DDL_AUTO=none siempre: no se ejecutan migraciones ni cambios de esquema.
  - Verifica dependencias y puertos libres antes de iniciar (no crea procesos duplicados).
  - Registra PID e instante de inicio en .run\pids.json para que detener_servicios.ps1 detenga SOLO
    esos procesos (aunque Windows reutilice un PID).
  - Al terminar, retira de esta sesion las variables cargadas desde .env y las contrasenas de BD.
  - Integraciones externas (Mercado Pago, SMTP, Meta, Supabase Storage, WhatsApp QR) quedan
    desactivadas salvo que sus variables esten definidas (ver .env.example).

.PARAMETER EnvFile
  Ruta del archivo de configuracion (por defecto .env en la raiz del repositorio).

.PARAMETER CrearEnv
  Crea .env a partir de .env.example y termina, sin iniciar servicios. Nunca sobrescribe un .env existente.

.EXAMPLE
  .\iniciar_servicios.ps1               # usa .env si existe; si no, pregunta los datos de la BD
.EXAMPLE
  .\iniciar_servicios.ps1 -CrearEnv     # crea .env desde la plantilla para editarlo
.EXAMPLE
  .\iniciar_servicios.ps1 -SinFrontend  # todo excepto Angular
#>
[CmdletBinding()]
param(
    [string]$DbUrl,
    [string]$DbUsername,
    [string]$EnvFile,
    [switch]$SinFrontend,
    [switch]$CrearEnv
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$runDir = Join-Path $root '.run'
$logDir = Join-Path $runDir 'logs'
$pidFile = Join-Path $runDir 'pids.json'
if (-not $EnvFile) { $EnvFile = Join-Path $root '.env' }

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Fail($msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

# Variables que nunca se aceptan desde .env: afectarian a todos los procesos hijos
# (por ejemplo PORT cambiaria el puerto de whatsapp-service) o al propio sistema.
$script:EnvBloqueadas = @('PORT', 'PATH', 'PATHEXT', 'COMSPEC', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP',
    'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'JAVA_HOME', 'NODE_OPTIONS', 'JAVA_TOOL_OPTIONS', 'PSMODULEPATH')

<#
  Lee KEY=VALUE de un archivo .env (UTF-8, con o sin BOM). Admite comentarios (#), lineas vacias,
  prefijo "export", valores entre comillas simples o dobles y comentarios al final de valores sin
  comillas (" #"). No expande variables ni ejecuta nada. Devuelve un OrderedDictionary.
#>
function Read-DotEnv([string]$Path) {
    $vars = [ordered]@{}
    $n = 0
    foreach ($linea in [IO.File]::ReadAllLines($Path, [Text.Encoding]::UTF8)) {
        $n++
        $t = $linea.Trim()
        if ($t -eq '' -or $t.StartsWith('#')) { continue }
        if ($t -match '^export\s+') { $t = $t -replace '^export\s+', '' }
        $i = $t.IndexOf('=')
        if ($i -lt 1) { Write-Host "    AVISO: .env linea $n ignorada (formato KEY=VALUE)." -ForegroundColor Yellow; continue }
        $clave = $t.Substring(0, $i).Trim()
        $valor = $t.Substring($i + 1).Trim()
        if ($clave -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
            Write-Host "    AVISO: .env linea $n ignorada (nombre de variable invalido)." -ForegroundColor Yellow; continue
        }
        if ($valor.Length -ge 2 -and (($valor[0] -eq '"' -and $valor[-1] -eq '"') -or ($valor[0] -eq "'" -and $valor[-1] -eq "'"))) {
            $valor = $valor.Substring(1, $valor.Length - 2)
        } else {
            $c = $valor.IndexOf(' #')
            if ($c -ge 0) { $valor = $valor.Substring(0, $c).TrimEnd() }
        }
        $vars[$clave] = $valor
    }
    return $vars
}

# --- 0. Crear .env desde la plantilla (opcional) -----------------------------------------------
if ($CrearEnv) {
    $plantilla = Join-Path $root '.env.example'
    if (Test-Path $EnvFile) { Fail "Ya existe $EnvFile; no se sobrescribe. Editalo directamente." }
    if (-not (Test-Path $plantilla)) { Fail "No se encontro .env.example." }
    Copy-Item $plantilla $EnvFile
    Write-Host "Creado $EnvFile a partir de .env.example. Completa los valores marcados con <...> y vuelve a ejecutar el script." -ForegroundColor Green
    exit 0
}

# --- 1. Procesos previos del proyecto -----------------------------------------------------------
# Un PID solo cuenta como "nuestro" si el proceso sigue vivo y (cuando se registro) coincide su inicio.
function Get-ProcesosRegistrados {
    if (-not (Test-Path $pidFile)) { return @() }
    # En PS 5.1 ConvertFrom-Json emite el arreglo como UN objeto: se asigna primero y luego se envuelve.
    $json = Get-Content $pidFile -Raw | ConvertFrom-Json
    $registro = @($json)
    return @($registro | Where-Object {
        $proc = Get-Process -Id $_.pid -ErrorAction SilentlyContinue
        $proc -and (-not $_.inicio -or ($proc.StartTime.ToUniversalTime().ToString('o') -eq $_.inicio))
    })
}
$previos = Get-ProcesosRegistrados
if ($previos.Count -gt 0) {
    Fail "Ya hay servicios del proyecto en ejecucion ($($previos.name -join ', ')). Ejecuta .\detener_servicios.ps1 primero."
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
    if ($c) {
        $nombre = (Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue).ProcessName
        $ocupados += "$p ($nombre, PID $($c.OwningProcess))"
    }
}
if ($ocupados.Count -gt 0) {
    Fail ("Puertos ocupados: $($ocupados -join ', '). No se inicia nada para evitar duplicados. " +
        "Si son servicios de una ejecucion anterior, usa .\detener_servicios.ps1; si no, cierra esos procesos manualmente.")
}

# --- 4. Configuracion: .env privado + entorno (el entorno tiene prioridad) ----------------------
$cargadasDesdeEnv = @()
if (Test-Path $EnvFile) {
    Write-Step "Cargando configuracion desde $(Split-Path $EnvFile -Leaf)"
    $vars = Read-DotEnv $EnvFile
    $prioridadEntorno = @(); $placeholders = @(); $bloqueadas = @()
    foreach ($clave in $vars.Keys) {
        $valor = $vars[$clave]
        if ($script:EnvBloqueadas -contains $clave.ToUpperInvariant()) { $bloqueadas += $clave; continue }
        if ($valor -match '^<.*>$') { $placeholders += $clave; continue }
        if ([Environment]::GetEnvironmentVariable($clave, 'Process')) { $prioridadEntorno += $clave; continue }
        if ($valor -eq '') { continue }
        [Environment]::SetEnvironmentVariable($clave, $valor, 'Process')
        $cargadasDesdeEnv += $clave
    }
    Write-Host "    $($cargadasDesdeEnv.Count) variable(s) cargada(s) desde .env." -ForegroundColor DarkGray
    if ($prioridadEntorno.Count) { Write-Host "    Ya definidas en el entorno (se respetan): $($prioridadEntorno -join ', ')" -ForegroundColor DarkGray }
    if ($placeholders.Count) { Write-Host "    Sin completar en .env (se ignoran): $($placeholders -join ', ')" -ForegroundColor Yellow }
    if ($bloqueadas.Count) { Write-Host "    No permitidas en .env (se ignoran): $($bloqueadas -join ', ')" -ForegroundColor Yellow }
} else {
    Write-Step 'Sin archivo .env: configuracion interactiva (usa -CrearEnv para crear uno)'
}

Write-Step 'Configuracion de base de datos'
if (-not $DbUrl) { $DbUrl = $env:DB_URL }
if (-not $DbUsername) { $DbUsername = $env:DB_USERNAME }
if (-not $DbUrl) { $DbUrl = Read-Host 'JDBC URL (ej. jdbc:postgresql://127.0.0.1:5432/cursos_db)' }
if (-not $DbUsername) { $DbUsername = Read-Host 'Usuario de base de datos' }
$dbPassword = $env:DB_PASSWORD
if ($dbPassword) {
    Write-Host '    Contrasena de base de datos tomada de la configuracion (no se muestra).' -ForegroundColor DarkGray
} else {
    $secure = Read-Host 'Contrasena de base de datos (no se mostrara)' -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $dbPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}
if (-not $dbPassword) { Fail 'La contrasena no puede estar vacia.' }

$env:DB_URL = $DbUrl; $env:SPRING_DATASOURCE_URL = $DbUrl
$env:DB_USERNAME = $DbUsername; $env:SPRING_DATASOURCE_USERNAME = $DbUsername
$env:DB_PASSWORD = $dbPassword; $env:SPRING_DATASOURCE_PASSWORD = $dbPassword
# Siempre none, aunque el .env o el entorno digan otra cosa: nunca alterar el esquema existente.
$env:SPRING_JPA_HIBERNATE_DDL_AUTO = 'none'
if (-not $env:SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE) { $env:SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE = '3' }

# JWT_SECRET compartido por auth/cursos/pedidos/gateway. Si no se define, se genera uno aleatorio
# para esta sesion (los tokens emitidos dejan de valer al reiniciar).
if (-not $env:JWT_SECRET -or $env:JWT_SECRET.Length -lt 32) {
    $bytes = New-Object byte[] 48
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $env:JWT_SECRET = [Convert]::ToBase64String($bytes)
    Write-Host '    JWT_SECRET generado aleatoriamente para esta sesion (definelo en .env para conservar sesiones).' -ForegroundColor DarkGray
}

# Integraciones: solo avisos, sin mostrar valores.
if ($env:MERCADOPAGO_ACCESS_TOKEN) {
    if (-not $env:MERCADOPAGO_ACCESS_TOKEN.StartsWith('TEST-')) {
        Write-Host '    AVISO: MERCADOPAGO_ACCESS_TOKEN no es de PRUEBA (TEST-); los cobros serian reales.' -ForegroundColor Red
    } else {
        Write-Host '    Mercado Pago: credenciales de PRUEBA configuradas.' -ForegroundColor DarkGray
    }
} else {
    Write-Host '    Mercado Pago sin configurar: el checkout no podra crear preferencias.' -ForegroundColor Yellow
}
if ($env:SMTP_HOST -or $env:SPRING_MAIL_USERNAME) {
    Write-Host '    AVISO: SMTP configurado; los correos de bienvenida y comprobantes se enviaran de verdad.' -ForegroundColor Yellow
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
        $inicio = $null
        try { $inicio = $p.StartTime.ToUniversalTime().ToString('o') } catch { }
        $lanzados += [pscustomobject]@{ name = $s.name; port = $s.port; pid = $p.Id; inicio = $inicio }
        $lanzados | ConvertTo-Json | Set-Content -Encoding utf8 $pidFile
    }
}
finally {
    # Los procesos ya heredaron las variables; se retiran de esta sesion las contrasenas
    # y todo lo que se cargo desde .env (lo definido previamente por el usuario se conserva).
    $dbPassword = $null
    Remove-Item Env:DB_PASSWORD, Env:SPRING_DATASOURCE_PASSWORD -ErrorAction SilentlyContinue
    foreach ($clave in $cargadasDesdeEnv) { [Environment]::SetEnvironmentVariable($clave, $null, 'Process') }
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
