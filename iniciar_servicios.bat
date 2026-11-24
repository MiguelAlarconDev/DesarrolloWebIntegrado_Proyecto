@echo off
rem Envoltorio: el arranque real (verificaciones, contrasena sin eco, ddl-auto=none) esta en iniciar_servicios.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar_servicios.ps1" %*
