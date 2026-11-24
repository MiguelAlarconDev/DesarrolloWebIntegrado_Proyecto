<#
.SYNOPSIS
  Detiene SOLO los procesos lanzados por iniciar_servicios.ps1 (registrados en .run\pids.json),
  incluyendo sus procesos hijos (java, node, python). No toca otros procesos del equipo.
#>
$pidFile = Join-Path $PSScriptRoot '.run\pids.json'

if (-not (Test-Path $pidFile)) {
    Write-Host 'No hay servicios registrados (.run\pids.json no existe).' -ForegroundColor DarkGray
    exit 0
}

$registrados = @(Get-Content $pidFile -Raw | ConvertFrom-Json)
foreach ($s in $registrados) {
    if (Get-Process -Id $s.pid -ErrorAction SilentlyContinue) {
        Write-Host "Deteniendo $($s.name) (PID $($s.pid)) y sus procesos hijos..." -ForegroundColor Yellow
        & taskkill.exe /PID $s.pid /T /F | Out-Null
    } else {
        Write-Host "$($s.name) ya no estaba en ejecucion." -ForegroundColor DarkGray
    }
}
Remove-Item $pidFile -Force
Write-Host 'Servicios del proyecto detenidos.' -ForegroundColor Green
