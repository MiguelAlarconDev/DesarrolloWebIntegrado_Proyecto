# Script para iniciar todos los microservicios y el frontend en ventanas independientes
$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }

& "$root\iniciar_servicios.bat"
