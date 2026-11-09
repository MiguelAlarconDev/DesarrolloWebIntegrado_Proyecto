<#
.SYNOPSIS
  Detiene SOLO los procesos lanzados por iniciar_servicios.ps1 (registrados en .run\pids.json),
  incluyendo sus procesos hijos (java, node, python). No toca otros procesos del equipo.
  Si el registro guarda el instante de inicio, solo se detiene el proceso cuyo PID y
  arranque coinciden (protege frente a PID reutilizados tras reiniciar Windows).
#>
$pidFile = Join-Path $PSScriptRoot '.run\pids.json'

if (-not (Test-Path $pidFile)) {
    Write-Host 'No hay servicios registrados (.run\pids.json no existe).' -ForegroundColor DarkGray
    exit 0
}

# En PS 5.1 ConvertFrom-Json emite el arreglo como UN objeto: se asigna primero y luego se envuelve.
$json = Get-Content $pidFile -Raw | ConvertFrom-Json
$registrados = @($json)
foreach ($s in $registrados) {
    $proc = Get-Process -Id $s.pid -ErrorAction SilentlyContinue
    if (-not $proc) {
        Write-Host "$($s.name) ya no estaba en ejecucion." -ForegroundColor DarkGray
        continue
    }
    if ($s.inicio -and $proc.StartTime.ToUniversalTime().ToString('o') -ne $s.inicio) {
        Write-Host "$($s.name): el PID $($s.pid) pertenece ahora a otro proceso ($($proc.ProcessName)); no se toca." -ForegroundColor Yellow
        continue
    }
    Write-Host "Deteniendo $($s.name) (PID $($s.pid)) y sus procesos hijos..." -ForegroundColor Yellow
    & taskkill.exe /PID $s.pid /T /F | Out-Null
}
Remove-Item $pidFile -Force
Write-Host 'Servicios del proyecto detenidos.' -ForegroundColor Green
