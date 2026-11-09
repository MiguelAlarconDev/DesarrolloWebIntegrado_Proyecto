# Fase 2 — decisiones académicas

Migración manual: `migracion_certificaciones_fase_2.sql`, después de Aula Fase A y E2.
No es una migración automática. Revisar permisos del rol backend antes de producción:
RLS sin políticas impide acceso a roles ordinarios; se mantiene el patrón del aula.
No dar acceso directo desde Angular. Usar `psql -v ON_ERROR_STOP=1 -f ...` solamente
tras autorización específica para el entorno destino. No se ejecutó en Supabase.

## Contrato

Base `/api/cursos/{cursoId}/aula/aprobaciones/{estudianteId}`. JWT DOCENTE asignado y
matrícula PAGADO obligatorios en todos los endpoints, también lecturas e historial.
ADMIN no tiene excepción. Todas las respuestas privadas usan `no-store`.

- GET `/evidencia`: recomendación de Fase 1, filas/versiones y `evidenciaHash` SHA-256.
- GET base: revisión vigente, `requiereRevision` y `habilitaCertificacion` calculados.
- GET `/historial?page=0&size=20`: paginado, máximo 100; sin decisión devuelve lista vacía.
- POST base: `{decision: APROBADO|NO_APROBADO, justificacion, versionEsperada, evidenciaHash}`.
- POST `/revocaciones`: mismos campos salvo `decision`; requiere decisión existente.
- Ambas escrituras requieren UUID `Idempotency-Key`. Devuelven 200 y la revisión
  inmutable, tanto en creación como en repetición idempotente. Primera versión esperada -1.
- 400 contrato inválido; 401 JWT; 403 permisos/matrícula; 404 sin curso/decisión;
  409 evidencia, versión, clave o bloqueo concurrente; 503 Pedidos indisponible.

Justificación obligatoria siempre (1–20000 caracteres). Un docente puede aprobar
contra NO_APTO o SIN_DATOS_SUFICIENTES, pero solo mediante una decisión explícita.
No se genera aprobación automáticamente. Fase 1 permanece sin cambios de contrato.

## Consistencia (correcciones de la auditoría)

**Revisión académica monotónica por curso.** `curso_revision_academica(curso_id, revision)`.
Triggers en `aula_tareas` y `aula_entregas` la incrementan ante cualquier INSERT, UPDATE o
DELETE, incluido el SQL directo, y se revierten junto con su transacción. Otro trigger impide
reducirla, borrarla o truncarla. Cada decisión guarda la revisión sobre la que se tomó. Una
decisión es vigente solo si esa revisión y el hash coinciden con los actuales. Como la revisión
no retrocede, una aprobación desactualizada **nunca** recupera vigencia, aunque los datos
vuelvan a coincidir (nota cambiada y restaurada, o tarea creada y eliminada).

**Coordinación por curso, sin bloqueos globales.** Todos los escritores académicos adquieren
primero la fila de revisión del curso (`CoordinacionAcademica.BLOQUEAR_CURSO`, un upsert que
bloquea la fila): `TareaService` (crear, editar, eliminar), la confirmación de entrega y la
calificación. Orden uniforme: curso → tarea → entrega/archivo. Las decisiones y la emisión toman
solo el curso y luego leen; las transacciones de solo lectura del aula no toman el curso. Así no
hay ciclos de espera. Se eliminaron `LOCK TABLE ... IN SHARE MODE` y el advisory lock
curso/alumno. Se conserva el advisory lock por actor+clave para reintentos idempotentes. Los
cursos distintos no se esperan entre sí. Un escritor por SQL directo bloquea el curso desde el
trigger.

**Evidencia canónica versionada.** `evidencia-academica/v2`:
- JSON con claves en orden fijo, UUID en minúsculas y decimales de escala 2;
- tareas ordenadas por id, con su versión, la versión de la entrega, el estado, la nota y la confirmación;
- el resultado (recomendación, totales y promedio), la política y la revisión del curso;
- sin textos de presentación.

SHA-256 sobre UTF-8. Se guarda en `evidencia_canonica`, y un CHECK de PostgreSQL verifica el hash
con `sha256()`. La copia para mostrar (`evidencia`, con explicaciones) no forma parte del hash.

**Contratos HTTP:** sin cambios incompatibles. Solo se agrega `revisionAcademica` a las
respuestas de evidencia y de revisión.

**Futura emisión (`ValidadorEmision.conAprobacionVigente`).**
1. Revalida la matrícula PAGADO inmediatamente antes, sin bloqueos abiertos.
2. En una sola transacción bloquea el curso y el curso FOR SHARE; relee la decisión vigente, exige
   APROBADO, la misma revisión, el hash recalculado igual y el hash canónico íntegro.
3. Ejecuta la emisión dentro de esa misma transacción.

Límite no resoluble sin modificar Pedidos: PAGADO vive en otro servicio y no puede ser atómico
con esta transacción. Un reembolso entre el paso 1 y el commit no se detecta aquí.

Se mantiene lo demás: CAS de versión, unicidad curso/alumno, FK diferida hacia la revisión
existente, historial inmutable por triggers e idempotencia, que devuelve la revisión original.

## Requisitos de despliegue (no ejecutado en Supabase)

- **Orden:** aplicar Aula Fase A → E2 → esta migración, en la misma ventana de mantenimiento.
  **Los escritores del aula requieren `curso_revision_academica`:** sin esta migración, crear,
  editar o eliminar tareas, entregar y calificar fallan.
- **Ejecutar como el rol propietario que usa el backend.** RLS sin políticas: solo el
  propietario (o un rol BYPASSRLS) accede. Los triggers se ejecutan como el rol que escribe. Si
  otro rol escribiera en las tablas del aula, el trigger fallaría y bloquearía la escritura
  (comportamiento cerrado ante fallos).
- **Privilegios:** se revocan de PUBLIC, `anon` y `authenticated` en las tablas y funciones
  nuevas. Hace falta porque Supabase concede privilegios por defecto sobre los objetos nuevos.
- **Requisitos:** `sha256()` requiere PostgreSQL 11 o superior. Las triggers nuevas sobre
  `aula_tareas` y `aula_entregas` requieren ser propietario de esas tablas.
- **Comando**, solo tras autorización y con respaldo:
  `psql -X -v ON_ERROR_STOP=1 -f database/migracion_certificaciones_fase_2.sql`
  (Session pooler, sin `-1`).

## Validación aislada

`AprobacionPostgresTest` solo se habilita con `-Daprobaciones.postgres.test=true`.
Requiere PostgreSQL local 127.0.0.1:55442 (y para el resto: aula 55439, recomendaciones 55441), DB vacía `aprobaciones_validation`, usuario
de prueba `aprobaciones_test`, cluster_name `aprobaciones-isolated-validation`.
Verifica identidad y vacío antes de DDL. No utiliza configuración de la aplicación.
Aplica las migraciones existentes al clúster aislado y valida Hibernate, restricciones,
historial, evidencia obsoleta, idempotencia y concurrencia con transacciones reales.
Las pruebas HTTP usan MockMvc y filtro JWT real; no equivalen a un servidor HTTP vivo.
