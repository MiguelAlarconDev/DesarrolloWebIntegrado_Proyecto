Write-Host "Deteniendo servicios en los puertos 8080, 8081, 8082, 8083, 8084, 4200..." -ForegroundColor Yellow

$ports = @(8080, 8081, 8082, 8083, 8084, 4200)
$conns = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in $ports }

if ($conns) {
    $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($p in $pids) {
        try {
            taskkill /F /T /PID $p 2>$null
            Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
            Write-Host "Proceso $p detenido." -ForegroundColor Green
        } catch {
            Write-Host "No se pudo detener el proceso $p" -ForegroundColor Red
        }
    }
} else {
    Write-Host "No habia puertos activos ocupados." -ForegroundColor Cyan
}

Get-Process -Name java -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "Servicios detenidos completamente." -ForegroundColor Green
