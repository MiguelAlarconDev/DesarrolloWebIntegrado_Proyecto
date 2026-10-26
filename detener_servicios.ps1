# Script para detener los servicios de la plataforma
Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host "   Deteniendo Servicios de Gestion de Cursos..." -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Yellow

$ports = @(3000, 8080, 8081, 8082, 8083)

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pids) {
            try {
                $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
                if ($p) {
                    Write-Host "Terminando proceso $($p.ProcessName) (PID: $procId) en puerto $port..." -ForegroundColor Red
                    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                }
            } catch {}
        }
    } else {
        Write-Host "Puerto $port ya esta libre." -ForegroundColor DarkGray
    }
}

Write-Host "`nServicios detenidos correctamente." -ForegroundColor Green
