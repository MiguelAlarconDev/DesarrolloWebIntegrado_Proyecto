# E.4 — Revision docente y calificaciones

Backend unicamente. Reutiliza AulaService.autorizarModulo, EntregaService, JWT,
entidades/repositorios y Storage de E.2/E.3. Sin cambios a Auth, Pedidos, Gateway,
pagos, frontend, dependencias ni configuracion. No requiere cambios SQL a E.2.

## Endpoints

Base: `/api/cursos/{cursoId}/aula/modulos/{moduloId}/tareas/{tareaId}`.

- GET `/entregas?page=0&size=20`: exclusivo del docente actualmente asignado.
  Page >= 0; size entre 1 y 100. Orden ascendente entregadaEn,id.
  Respuesta `{items:[{estudianteId,entrega}],page,size,totalElements,totalPages}`.
  entrega tiene id, tareaId, texto, estado, entregadaEn, version, archivo (metadatos),
  nota, retroalimentacion y calificadaEn. No incluye claves de objeto ni URLs.
  Solo ENTREGADA/CALIFICADA; pendientes no se cuentan ni publican. Una pagina
  posterior a la ultima devuelve items vacio, conservando totales.
- PUT `/entregas/{entregaId}/calificacion`: docente asignado; JSON obligatorio:
  `{"nota":12.34,"retroalimentacion":"Revisar ejercicio 2","version":0}`.
  Nota 0..20 inclusive y maximo dos decimales (sin redondear entradas invalidas).
  Feedback no vacio maximo 20000 caracteres. Version entera no negativa y vigente.
  Respuesta 200 con entrega actualizada, nota normalizada a escala 2, estado CALIFICADA
  y nueva version. No se aceptan campos para cambiar estudiante ni autor de la nota.
- GET `/entregas/{entregaId}/archivo/descarga`: docente asignado, URL firmada 60 s.
  404 si entrega no pertenece a tarea o no hay archivo; 409 si esta incompleta.
- GET `/mi-entrega` existente: ahora incluye nota, retroalimentacion, calificadaEn.
  Antes de calificar son null. Sigue exigiendo ESTUDIANTE propietario con PAGADO.

ADMIN sin acceso especial. El alumno no accede al listado/calificacion/descarga
docente; conserva su descarga propia de E.3. No se consulta Auth para nombres:
el listado identifica estudiantes por UUID. Todas las respuestas privadas no-store.
Valida curso-modulo-tarea-entrega; 400 datos/paginacion invalidos, 401 sin JWT,
403 permisos, 404 recurso ajeno/inexistente, 409 version/estado, 503 dependencias.

## Consistencia

Usa el mismo FOR UPDATE de tarea que E.2/E.3, despues la entrega. Actualizacion
condicional de version y estado (ENTREGADA/CALIFICADA), recarga de JPA y guardado
atomico de nota, feedback, docente, fecha y estado. La version se consume incluso
si se repiten los mismos valores en el mismo instante; es opaca, no asumir +1.
El cliente debe utilizar la version devuelta por GET/PUT.

Publicacion inmediata tras commit: no hay borrador de nota. Recalificar usa el mismo
PUT y exige version vigente. Dos notas con la misma version producen un exito y un
409. Lo mismo ocurre entre un reemplazo del alumno y una calificacion sobre esa
version. Una entrega ya calificada no admite reemplazo por alumno.

Ante 409, recargar el listado y revisar antes de reenviar. Ante 503 de confirmacion
incierta, consultar tambien el listado antes de reintentar. Las descargas se firman
fuera de la transaccion; mantienen la limitacion temporal de URLs compartibles y
la posible carrera de reemplazo descrita en E.3.

## Pruebas

`mvn -pl cursos-service -am test '-Daula.postgres.test=true'`

Resultado final: BUILD SUCCESS, 94 pruebas aprobadas, 0 fallos, 0 errores, 0 omitidas.
Nuevas: RevisionHttpTest (8) y RevisionPostgresTest (1 escenario integrado).
Cobertura: permisos, cadena, paginacion, pendientes ocultas, 0/20/12.34, mas de dos
decimales, fuera de rango, feedback vacio/largo, version ausente/obsoleta, descarga
docente, privacidad del alumno, recalificacion igual y publicacion inmediata.
PostgreSQL real comprueba paginacion y carreras con dos hilos: recalificar contra
recalificar y calificar contra reemplazo. Incluye regresiones completas E.2/E.3,
materiales, matricula y catalogo.

PostgreSQL 18.6 temporal local en 127.0.0.1:55439, marcador
cluster_name=aula-isolated-validation; bases VACIAS aula_validation,
tareas_validation, entregas_validation y revision_validation, usuario aula_test.
Storage simulado; sin llamadas externas ni conexion a Supabase. Hibernate validate.
El cluster se detuvo al terminar. Sin propiedad de activacion se omiten las cuatro
pruebas PostgreSQL; para repetir usar bases/roles de prueba nuevos, nunca compartidos.

## Limites y siguiente fase

- Se conserva la ultima calificacion, autor y fecha; no hay historial de recalificaciones.
- La paginacion tiene orden determinista, pero cambios entre peticiones pueden mover filas.
- Cada pagina consulta metadatos por entrega (maximo 100); evaluar consulta por lote si
  las mediciones de produccion lo requieren. No se mantienen bloqueos durante Storage.
- Pendiente integrar UI docente/alumno en E.5 y validar configuracion remota solo
  cuando exista autorizacion. No se aplicaron migraciones reales ni se altero E.2 SQL.
