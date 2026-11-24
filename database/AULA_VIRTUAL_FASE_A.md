# Aula virtual — Fase A

Implementacion de modelo y autorizacion. No implementa Storage, descarga,
eliminacion de archivos ni Angular. No requiere cambios al login, 2FA ni pagos.

## Contratos

- `GET /api/cursos/{cursoId}/aula`: lista modulos con materiales ACTIVO.
  Docente asignado o ESTUDIANTE con pedido PAGADO. Respuesta sin object_key ni URL.
- `POST /api/cursos/{cursoId}/aula/modulos`: docente asignado, JSON
  `{"titulo":"Semana 1","orden":1}`, devuelve 201 y modulo creado.
- `PATCH /api/cursos/{cursoId}/aula/modulos/{moduloId}`: mismo JSON completo,
  docente asignado, pertenencia del modulo al curso; devuelve 204.
- `GET /api/pedidos/interno/matriculas/validacion?cursoId=UUID&estudianteId=UUID`:
  solo JWT SERVICE con sub=cursos-service; devuelve `{"habilitada":true|false}`.
  Consulta EXISTS exclusivamente para PAGADO, sin enriquecer ni llamar a Cursos.

Identidad del estudiante obtenida del subject validado, sin cache de permisos.
ADMIN y otros servicios no tienen acceso especial al aula. 401 sin token valido,
403 sin permisos, 404 recurso inexistente, 400 cuerpo invalido, 503 cuando no se
puede verificar matricula (conexion, respuesta invalida o error HTTP de Pedidos).
Catalogo publico conservado. Autorizacion en Cursos protege acceso directo a 8082.
Gateway ya enruta /api/cursos/** y /api/pedidos/**; no se modifica.

## JWT y configuracion

Reutiliza JwtVerifier HS256 y JWT_SECRET existente. La consulta de matricula usa
matriculaToken de 5 minutos con aud=pedidos-service:matriculas. Pedidos verifica
firma, expiracion, iat no futuro, duracion maxima de 300 segundos, audiencia y
rol SERVICE con sub=cursos-service. Tokens generales sin audiencia son rechazados
en este endpoint. serviceToken y validacion de las otras rutas no cambian.
El nombre de aplicacion emisor debe ser cursos-service. Configuracion opcional:
`services.pedidos.url` (variable Spring `SERVICES_PEDIDOS_URL`), por defecto
http://127.0.0.1:8083. Conexion 2 segundos y lectura 3 segundos; sin reintentos.
No nuevas credenciales. Al compartir clave HS256, la identidad SERVICE presupone
que todos los servicios con esa clave son confiables; no es aislamiento
criptografico entre servicios. No se cambia ese mecanismo en esta fase.

## Migracion manual pendiente

No hay Flyway/Liquibase configurado. ddl-auto predeterminado es none.
Revisar `migracion_aula_virtual_fase_a.sql`; NO se ejecuta al iniciar la aplicacion.
No usar schema_local.sql como migracion: contiene DROP de tablas existentes.
Aplicar solo tras aprobacion, primero en PostgreSQL aislado y con respaldo.

La migracion crea solo curso_modulos y curso_materiales, FKs RESTRICT e indices.
No cambia usuarios, cursos ni pedidos. UUID generado en Java. Orden positivo;
empates permitidos y ordenados por UUID. Limite interpretado como 10 MiB
(10,485,760 bytes). PDF, DOCX, PPTX, ZIP y MIME coherente mediante CHECK.
El CHECK no inspecciona bytes: validar contenido real corresponde a la subida
de la siguiente fase. Estado inicial PENDIENTE, nunca visible como ACTIVO.

Activa RLS sin politicas publicas y revoca acceso PUBLIC/anon/authenticated a
las tablas nuevas. Antes del despliegue verificar el rol JDBC real: debe ser
un rol backend confiable con acceso a estas tablas bajo RLS (propietario/BYPASSRLS
o politicas especificas revisadas). No conceder acceso al navegador para resolverlo.
La compatibilidad SQL y el mapeo JPA se validaron en PostgreSQL 18.6 aislado mediante
AulaPostgresTest: validate, persistencia, consultas derivadas y restricciones reales.
El rol JDBC de Supabase y su version exacta siguen pendientes de verificacion.
Sin migracion, el catalogo sigue funcionando con ddl-auto=none, pero los endpoints
del aula no estan listos para uso persistente. No habilitarlos en produccion aun.

No se incluye rollback destructivo automatico; si una aplicacion falla antes del
COMMIT, la transaccion revierte. Una vez que existan materiales, conservar datos.

## Pruebas aisladas

`mvn -pl cursos-service,pedidos-service -am test`

MockMvc aplica el filtro real y el controlador/servicio de Cursos sin Gateway;
peticiones con URL localhost:8082 simulan acceso directo, no abren un puerto real.
MockRestServiceServer valida contrato HTTP, Bearer, rechazo y caida de Pedidos.
Repositorios Mockito: ninguna conexion PostgreSQL ni mensaje, correo o pago real.
Las pruebas nuevas utilizan JWT de prueba, no secretos operativos.
MatriculaClient se simula con mock-maker-subclass para evitar instrumentar Object
de Java 25 con el Byte Buddy existente; no requiere modificar dependencias/POM.

## Pendiente antes de la siguiente fase

Revisar y autorizar migracion y verificar rol JDBC/RLS del despliegue.
Luego implementar Storage privado con validacion de contenido/10 MiB, compensacion
de fallos, descarga autorizada y borrado. Por ultimo pantallas Angular sin fallback
de identidad o matricula. Definir vigencia tras finalizacion del curso/reembolsos;
por ahora solo el estado PAGADO persistido otorga acceso al estudiante.

## Validacion PostgreSQL/JPA — 2026-11-07

PostgreSQL 18.6 instalado localmente; cluster nuevo en directorio temporal,
listen_addresses=127.0.0.1, puerto 55439, cluster_name=aula-isolated-validation,
base aula_validation, usuario local de prueba aula_test. No credenciales reales.
Docker estaba instalado pero su daemon no estaba activo; no fue necesario instalar nada.
El cluster se detuvo al finalizar. No hubo conexion a Supabase.

Comando PowerShell ejecutado:
`mvn -pl cursos-service,pedidos-service -am test '-Daula.postgres.test=true'`

Resultado final: Cursos 25, Pedidos 44; total 69 aprobadas, cero fallos/errores/omitidas.
Incluye una prueba PostgreSQL con multiples aserciones y una prueba de regresion
HTTP que recorre catalogo, todos, docente, detalle y detalle inexistente sin JWT.

El test real requiere una base VACIA, el puerto fijo y el marcador de cluster;
aborta antes de escribir si no coinciden. No lee DB_URL/DB_PASSWORD del entorno.
Para repetirlo, provisionar otro cluster temporal con esos valores (el previo debe
estar detenido). Crea roles anon/authenticated NOLOGIN solo en ese cluster.
Sin la propiedad de activacion, la prueba PostgreSQL se omite deliberadamente.
No ejecutar la prueba contra ninguna base compartida.

Comprobaciones reales:
- 15 columnas: nombres, UUID, varchar/longitudes, integer, bigint, timestamptz y NOT NULL.
- 5 indices (2 PK, UNIQUE object_key, 2 indices de busqueda), 3 FK RESTRICT, 9 CHECK.
- Rechazo de referencia inexistente, borrado de modulo referenciado, clave duplicada,
  titulo nulo/vacio, orden no positivo, tamanos 0 y >10 MiB, tipo/estado/MIME invalidos.
- Aceptacion de PDF/DOCX/PPTX/ZIP con MIME correspondiente y tamano limite de 10 MiB.
- RLS activo: anon/authenticated sin SELECT; aun concediendoles SELECT temporalmente,
  no ven filas sin politicas. Se revocaron nuevamente los permisos de prueba.
- Hibernate 6.6.8 inicializado con hibernate.hbm2ddl.auto=validate para ambas entidades
  reales, sin iniciar el resto del servicio ni llamar a proveedores. Persistio UUIDs,
  enum y timestamp UTC; consulto ambos repositorios Spring Data sobre PostgreSQL real.
- Esquema antes/despues de Hibernate identico. Columnas, restricciones propias,
  indices y contenido de usuarios/cursos/pedidos identicos antes/despues de migracion
  y pruebas. Las FK nuevas agregan triggers internos en tablas referenciadas y pueden
  impedir futuros borrados: no se afirma ausencia absoluta de cambios en el catalogo
  interno de PostgreSQL. No se modificaron columnas ni filas de esas tablas.

No hizo falta corregir SQL ni entidades. Se corrigio la ausencia de audiencia en
el contrato interno y se agregaron pruebas para audiencia ausente/ajena, firma externa,
token vencido, iat futuro, vida excesiva, identidad ajena y rol usuario.
La clave HS256 compartida sigue suponiendo servicios confiables; audiencia no equivale
a aislamiento criptografico frente a otro servicio que posea la misma clave.

Ejecuciones previas detectaron dos problemas de pruebas: Mockito con makers mezclados
en Java 25 (repositorios ahora usan PROXY explicitamente) y expectativa SQLSTATE
23503 para DELETE RESTRICT (PostgreSQL devuelve 23001). Resueltos sin cambiar POM,
versiones ni Java. El primer intento de comando tuvo un argumento PowerShell sin
comillas; no ejecuto pruebas. La ejecucion final completa termino BUILD SUCCESS.
