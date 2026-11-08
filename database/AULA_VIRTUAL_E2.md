# E.2 — Modelo y CRUD de tareas

No contiene endpoints de entregas, archivos de alumnos ni calificaciones.
No modifica frontend, Gateway, Auth, Pedidos, pagos ni variables de entorno.

## Contrato

Base: `/api/cursos/{cursoId}/aula/modulos/{moduloId}/tareas`.

- POST: docente asignado, 201.
- GET base: docente asignado o estudiante PAGADO, lista.
- GET `/{id}`: mismos permisos, detalle.
- PATCH `/{id}`: docente asignado, 200. Sin entregas y version coincidente.
- DELETE `/{id}?version=N`: docente asignado, 204. Sin entregas y version coincidente.

Cuerpo POST:
```json
{"titulo":"Practica 1","consigna":"Resolver los ejercicios","fechaLimite":"2030-01-01T15:00:00Z","tipoEntrega":"AMBOS"}
```
PATCH exige los cuatro campos editables y `version` obtenida del GET. Se eligio un
PATCH con grupo completo de campos para no confundir omisiones con valores nulos;
se documenta esta restriccion de contrato. DELETE exige version por la misma razon.
La respuesta incluye id, moduloId, campos editables y version. No acepta estudianteId,
moduloId, autor ni calificacion como datos persistibles del cuerpo.

401 JWT ausente/invalido; 403 sin permiso; 404 pertenencia/recurso inexistente;
400 JSON/campos invalidos; 409 version obsoleta, entregas existentes o conflicto de
integridad; 503 si Pedidos no puede verificar matricula. Respuestas no-store.
ADMIN no tiene permisos especiales. AulaService.autorizarModulo reutiliza las
reglas existentes: no hay una segunda implementacion de autorizacion.

Titulo obligatorio maximo 200; consigna obligatoria maximo 20000. Fecha obligatoria
con Z u offset, normalizada como Instant/timestamptz. No se exige una fecha futura
para crear/editar: no fue una restriccion solicitada. La prohibicion de entregar
fuera de plazo se implementara en E.3. America/Lima sera el formato de presentacion
en la fase Angular; E.2 no cambia pantallas ni la zona horaria global.

## Persistencia y concurrencia

Tres tablas nuevas, @Version BIGINT en las tres, FK RESTRICT, indices y RLS sin
politicas publicas. Una entrega por estudiante/tarea y un archivo por entrega.
Nota NUMERIC(4,2) 0..20, y calificacion consistente con retroalimentacion no vacia,
autor y fecha. Estado ENVIO_PENDIENTE admite reserva para subida futura sin fingir
que la entrega ya fue recibida. El servidor de E.3/E.4 debera validar reglas entre
tablas, plazos, precision decimal y transiciones; los CHECK no sustituyen esas reglas.

Editar/borrar obtiene bloqueo FOR UPDATE de la tarea y consulta entregas en la
misma transaccion. Cualquier entrega, incluso pendiente, bloquea ambas operaciones.
La version del cliente impide sobrescribir ediciones anteriores. FK RESTRICT protege
el borrado frente a nuevas entregas. E.3 debera bloquear la MISMA tarea al aceptar
una entrega y al comprobar tipo/plazo, y bloquear/versionar la entrega para reemplazos.

Tipos acordados: TEXTO exige texto, ARCHIVO exige archivo, AMBOS exige al menos uno.
Estas reglas dependen de tarea y archivo y quedan para E.3; no hay endpoints que
permitan saltarlas en E.2. PDF/DOCX/PPTX/ZIP y 10 MiB ya estan acotados en SQL.
No reutilizar curso_materiales para archivos privados de alumnos.

## Aplicacion manual posterior (requiere autorizacion)

1. Respaldar y revisar el esquema objetivo y el rol JDBC/RLS.
2. Confirmar que la migracion de Fase A ya esta aplicada, sin volver a ejecutarla.
3. Revisar `migracion_aula_virtual_e2.sql`. No usar schema_local.sql (contiene DROP).
4. Desde psql conectado al proyecto verificado, ejecutar:
   `\i database/migracion_aula_virtual_e2.sql` con `\set ON_ERROR_STOP on`.
5. La migracion contiene BEGIN/COMMIT y lock_timeout=5s. Ante error, ROLLBACK en
   la sesion; no continuar manualmente con sentencias aisladas. No es idempotente:
   un segundo intento tras exito falla deliberadamente, sin ocultar divergencias.
6. Mantener ddl-auto=none/validate, nunca update. Comprobar permisos backend y RLS.

No cambia filas ni columnas existentes, pero las FK agregan dependencias/triggers
internos y pueden impedir futuros borrados de usuarios/modulos referenciados.

## Pruebas reproducibles

`mvn -pl cursos-service -am test '-Daula.postgres.test=true'`

Requiere cluster PostgreSQL desechable en 127.0.0.1:55439 con marcador
cluster_name=aula-isolated-validation, usuario local aula_test, bases VACIAS
aula_validation y tareas_validation. Los tests no leen DB_URL ni credenciales
reales y comprueban marcador/base antes de escribir. Cada repeticion necesita
bases nuevas; no apuntar a una instancia compartida. Sin la propiedad se omiten
las dos pruebas PostgreSQL de forma explicita.

Validacion realizada: PostgreSQL 18.6 en cluster temporal separado, detenido al
finalizar. Resultado final: BUILD SUCCESS, 68 pruebas, 0 fallos, 0 errores, 0 omitidas
(13 nuevas de E.2). Sin conexion a Supabase ni proveedores reales. Sin nuevas
dependencias. Quedan avisos del JDK/Mockito y API de transacciones de prueba obsoleta,
sin fallos de compilacion ni de ejecucion.

TareaHttpTest: filtro JWT, controlador y servicios reales, dependencias simuladas.
TareaPostgresTest: migraciones A+E.2, Hibernate validate, tres entidades, CRUD real
transaccional, repositorios, incremento de version, conflicto entre dos contextos,
UNIQUE/FK/CHECK, nota 0/20, limites de archivo, RLS y datos previos conservados.
La prueba PostgreSQL de Fase A conserva su alcance con dos entidades explicitas,
para no exigir tablas de una migracion posterior al verificar Fase A.

## Pendiente E.3

Aceptar/reemplazar entrega antes del plazo si no esta calificada; validar al menos
un contenido en AMBOS; integrar almacenamiento privado con compensacion/reintentos;
evitar entregas pendientes abandonadas; aislar archivos del resto del alumnado.
No hay carga masiva, paginacion de tareas ni interfaces Angular en esta fase.
