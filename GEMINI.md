# Reglas del Proyecto

## Sincronización de Git al iniciar
- Al entrar al repositorio o comenzar una tarea, siempre ejecutar `git fetch origin` para verificar y sincronizar la última versión trabajada.
- **Rama principal del proyecto**: La rama principal activa en este repositorio remoto es `master` (en GitHub `origin/HEAD -> origin/master`), donde se integran los cambios de `develop`. Mantener la rama de trabajo alineada con la última versión de `origin/master`.
- Respetar los cambios y archivos locales en progreso; si hay modificaciones locales sin guardar, realizar un `git stash` o consultar antes de sobreescribir.
