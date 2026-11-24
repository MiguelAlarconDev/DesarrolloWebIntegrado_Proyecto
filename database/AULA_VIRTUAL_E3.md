# E.3 — Entregas propias y archivos privados

Implementacion limitada a estudiantes. No incluye revision docente, calificacion,
retroalimentacion ni Angular. No cambia Gateway, Auth, Pedidos, pagos o variables
de entorno. Reutiliza la autorizacion de AulaService/MatriculaClient, el validador
de archivos y AlmacenamientoArchivos/SupabaseStorageClient existentes.

## Contrato HTTP

Base: `/api/cursos/{cursoId}/aula/modulos/{moduloId}/tareas/{tareaId}/mi-entrega`.

- POST multipart/form-data: `version` obligatorio, `texto` opcional y parte `archivo`
  opcional. `version=-1` significa primera entrega. Para reemplazar, enviar exactamente
  la version obtenida con GET. Respuesta 200 tanto al crear como al reemplazar.
- GET base: entrega propia confirmada; 404 si no existe. Devuelve id, tareaId, texto,
  estado, entregadaEn, version y metadatos del archivo (sin objectKey ni credenciales).
- GET `/archivo/descarga`: URL firmada de 60 segundos, expiraEn y nombreArchivo.
  404 si no existe archivo. No hay parametro de estudiante ni entrega ajena.

Todas las respuestas privadas tienen Cache-Control: no-store mediante el filtro
existente, ademas de los encabezados del controlador. La identidad procede solo
del JWT. Campos estudianteId/entregaId del formulario no se usan. ADMIN, DOCENTE
y SERVICE no pueden acceder a estos endpoints como alumnos.

Semantica de reemplazo COMPLETO: lo omitido no se conserva. Reemplazar con texto
sin archivo elimina la referencia anterior al archivo; reemplazar con archivo sin
texto elimina el texto anterior, si el tipo de tarea lo permite. La interfaz futura
debera advertirlo y enviar todos los contenidos deseados.

TEXTO exige texto no vacio; ARCHIVO exige archivo valido; AMBOS exige al menos uno.
No se prohibe contenido complementario en TEXTO/ARCHIVO: se exige el contenido
obligatorio indicado por los requisitos. Texto hasta 20000 caracteres. Un archivo,
PDF/DOCX/PPTX/ZIP y maximo 10 MiB. Archivo presente pero vacio es invalido.

El reloj UTC del servidor decide el plazo: instante igual al limite permitido,
posterior rechazado. Se comprueba antes y despues de la subida, tras adquirir el
bloqueo de tarea; no se confia en fechas del cliente. Consultar/descargar una entrega
propia sigue permitido despues del plazo si la matricula permanece PAGADO.

Codigos: 400 contenido/version/formato invalido; 401 JWT invalido/ausente;
403 rol o matricula; 404 cadena/recurso inexistente; 409 version obsoleta, plazo
vencido, entrega calificada o incompleta; 413 archivo excesivo; 503 dependencia
indisponible o resultado de commit incierto. Ante 409/503, hacer GET antes de
reintentar: no incrementar la version ni reenviar automaticamente.

## Consistencia PostgreSQL–Storage

1. Validar JWT ESTUDIANTE, matricula PAGADO, curso/modulo, contenido y archivo.
2. Transaccion breve con FOR UPDATE sobre tarea: verificar pertenencia, plazo,
   estado y version de entrega. Finalizar la transaccion antes de usar Storage.
3. Si hay archivo, subir con clave UUID NUEVA bajo `entregas/{tarea}/{alumno}/...`.
   Nunca sobrescribir el objeto anterior ni usar el nombre del usuario como clave.
4. Segunda transaccion FOR UPDATE: repetir comprobaciones. En un reemplazo,
   consumir la version con UPDATE condicional `id/version/estado=ENTREGADA` y
   limpiar el contexto JPA antes de recargar. Incluso un reemplazo solo de archivo
   con el mismo texto e instante cambia la version. Version es un token opaco:
   puede avanzar mas de una unidad por los cambios JPA adicionales.
5. Guardar entrega y referencia de archivo ACTIVO atomicamente. Sin archivo, borrar
   la referencia anterior en esa transaccion. Solo devolver exito despues del commit.
6. Borrar el objeto anterior despues del commit. Si falla esa limpieza, la entrega
   nueva sigue confirmada; registrar solo aviso generico y recuperar por inventario.

No hay transacciones de BD abiertas durante llamadas a Storage. La version antigua
permanece consultable durante la subida. No se persisten filas nuevas pendientes
para simular una entrega enviada. Filas ENVIO_PENDIENTE o archivos no ACTIVO
preexistentes devuelven conflicto en la lectura, sin presentarse como enviados.

Una tarea serializa brevemente las confirmaciones de sus estudiantes. UNIQUE
(tarea_id, estudiante_id) sigue siendo la defensa de integridad. Dos primeras
peticiones simultaneas con version=-1 producen un exito y un conflicto, no dos
entregas. La peticion perdedora limpia su objeto nuevo. E.4 debera respetar el mismo
orden de bloqueos (tarea, entrega) y @Version para evitar carreras con calificacion.

Fallos:
- Subida rechazada/timeout: intentar eliminar la clave nueva (puede haberse guardado
  aunque el proveedor no respondiera). No modificar la entrega anterior.
- Fallo SQL: la transaccion revierte cambios de entrega, version y archivo juntos.
- Commit incierto: en una transaccion nueva contra la BD primaria, bloquear la misma
  tarea y comprobar si la clave nueva esta referenciada. Si lo esta, NO borrarla.
  Si la consulta tambien falla, conservar el objeto y devolver 503, nunca adivinar.
- Caida del proceso o limpieza fallida: pueden quedar objetos huerfanos. No hay
  atomicidad distribuida ni trabajador automatico de limpieza en esta fase.

Las URLs son capacidades temporales y pueden compartirse durante su vigencia.
Una descarga concurrente con reemplazo puede fallar si el objeto anterior se borra;
solicitar otra URL de la entrega propia. No guardar URLs firmadas en cache o logs.

## Recuperacion operativa de huerfanos (manual, requiere autorizacion)

No se ejecuto contra Supabase. Procedimiento para un operador autorizado:

1. Confirmar proyecto y bucket privado; no mezclar el prefijo `cursos/` de materiales
   con `entregas/`. Pausar escrituras de entregas y esperar a que terminen peticiones
   y transacciones en curso. No limpiar mientras hay subidas activas.
2. Confirmar BD primaria saludable. Obtener un inventario PRIVADO de object_key de
   aula_entrega_archivos, incluyendo TODOS los estados, y del prefijo entregas/ en
   Storage. No publicar inventarios, contenidos, URLs ni credenciales en logs/Git.
3. Preparar primero un informe sin borrados de objetos sin referencia. Como margen,
   excluir objetos de menos de 24 horas. La antiguedad sola NO demuestra que sea
   huerfano: volver a comprobar referencias en primaria antes de eliminar.
4. Tras revision/aprobacion, borrar solo objetos sin referencia confirmada y antiguos,
   manteniendo escrituras pausadas. La eliminacion existente es idempotente.
5. Si hay referencia sin objeto, no borrar la entrega ni marcarla exitosa por otro
   medio: investigar respaldo/proveedor. Si hay estados pendientes antiguos, revisar
   su origen antes de cualquier cambio de datos; E.3 no los genera al subir.
6. Verificar nuevamente inventario y reanudar escrituras. Si la BD falla durante
   cualquier comprobacion, detener la limpieza y conservar los objetos.

## Migraciones

E.2 y Fase A NO se modifican. No hay migracion E.3 ni columnas nuevas. Las tablas
de E.2 deben existir antes de habilitar estos endpoints. Hibernate permanece sin
generacion automatica de esquema. Todas las escrituras realizadas en esta validacion
fueron sobre PostgreSQL temporal local, nunca Supabase.

## Validacion

`mvn -pl cursos-service -am test '-Daula.postgres.test=true'`

Resultado final: BUILD SUCCESS, 85 pruebas aprobadas, 0 fallos/errores/omitidas.
Incluye 16 pruebas HTTP nuevas y una prueba PostgreSQL nueva con escenarios multiples:
doble envio con dos hilos y barrera, reemplazo atomico, lectura durante subida,
cambio solo de archivo en mismo instante, rollback SQL, commit exitoso con acuse
perdido, timeout de Storage, fallo de limpieza y vencimiento durante subida.
Se ejecutaron las regresiones E.2, materiales, catalogo y seguridad existentes.

PostgreSQL 18.6 temporal en 127.0.0.1:55439, cluster_name=aula-isolated-validation,
usuario local aula_test; bases VACIAS aula_validation, tareas_validation y
entregas_validation. Los tests verifican marcador y nombre antes de escribir y no
leen DB_URL/DB_PASSWORD. Storage es un simulador local en memoria; no se enviaron
peticiones externas. Cluster detenido al finalizar. Para repetir, usar bases nuevas
y roles de prueba aislados; sin propiedad de activacion se omiten los tests PostgreSQL.

Durante el desarrollo se corrigieron tres configuraciones de mocks y un fallo real
de versionado detectado por la prueba de reemplazo solo de archivo. No se cambiaron
dependencias ni Java. La ejecucion final incluye ambos arreglos.

## Pendiente E.4

Revision/listado docente de entregas, descarga docente, nota 0..20, retroalimentacion,
recalificacion versionada y visibilidad inmediata de resultados. No se implementa
ninguna de esas operaciones aqui. Antes del despliegue real revisar permisos JDBC,
bucket privado y procedimiento de recuperacion; ninguna prueba confirma esa
configuracion remota porque no se consulto Supabase.
