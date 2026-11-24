# Fase 1: recuperacion y contratos

Estado: listo para revision final del alcance acordado (QR recuperado y migracion
Meta pospuesta explicitamente). Compilacion y validacion simulada aprobadas; esto
no acredita un despliegue productivo ni la arquitectura final sin Java/Meta.

## Procedencia

- Directorio `comprobantes-service`: restaurado desde `c9b8f2e`; sus archivos
  proceden de `a5a81bc`, sin cambios posteriores hasta esa referencia.
- Directorio `whatsapp-service`: restaurado desde `c9b8f2e`, ultima revision
  disponible antes del PR #10; implementacion inicial en `e7bdfdb`.
- `ComprobanteClient.java`: recuperado desde `b1517c6` y adaptado, no creado
  como un segundo cliente paralelo.
- Ninguna referencia de rama fue movida. No se recuperaron sesiones, secretos,
  node_modules, PDFs, logs ni archivos generados.

## Decision aprobada: recuperar QR y posponer migracion Meta

El servicio Node historico usa whatsapp-web.js + Puppeteer y sesion QR. El Java
actual usa Meta Cloud API, contiene envio por plantillas, estado y webhooks. La
instruccion de conservar funcionalidades impide sustituir silenciosamente Meta
por QR. Alternativas presentadas al usuario:

1. Autorizar traslado de la integracion Meta existente a Node, conservando QR
   como alternativa configurable y seleccionando solo un proveedor activo.
2. Recuperar QR y posponer la migracion Meta, dejando documentada la Fase 1 parcial.

El usuario selecciono: "Recuperar QR; dejar migracion Meta pendiente".
No se autoriza en esta fase trasladar Meta a Node ni sustituir sus funcionalidades.
Auth usa el servicio QR recuperado. Pedidos conserva su ruta
Meta anterior sin agregar un segundo envio a Node. No se ha arrancado ninguno.
No se afirma que los errores de esa ruta Meta anterior hayan sido corregidos.

## Puertos y rutas

| Servicio | Puerto | Contrato |
|---|---:|---|
| Gateway | 8080 | Rutas especificas antes de `/**` al frontend |
| Auth | 8081 | POST `/api/auth/login`, POST `/api/auth/verificar-2fa` |
| Cursos | 8082 | Sin cambios |
| Pedidos | 8083 | Contrato de pagos sin reescritura |
| FastAPI | 8084 | POST `/api/comprobantes/enviar`, GET `/api/comprobantes/{pedido_id}/descargar`, GET `/health` |
| WhatsApp Node | 8085 | POST `/api/whatsapp/send`, GET `/health` |

El alias GET `/api/comprobantes/descargar/{pedido_id}` conserva URLs Java antiguas
basadas en UUID. No acepta numeros de orden ficticios ni crea PDFs al descargar.
Los health checks son locales; el Gateway no agrega un health ambiguo compartido.

## Flujo OTP

```text
Cliente -> Gateway -> Auth (BCrypt)
  -> guardar OTP temporal -> Node /api/whatsapp/send {phone,message}
  -> whatsapp-web.js -> respuesta {success:true}
  -> Auth devuelve REQUIRES_2FA, sin codigo ni JWT final
Cliente -> Gateway -> Auth /verificar-2fa -> JWT e invalidacion del OTP
```

Fallo, timeout, respuesta vacia o `success:false`: Auth invalida OTP y devuelve
503. No reintenta automaticamente. No incluye cuerpos de proveedor en errores
ni imprime OTP. Se retiro la comparacion con password almacenado en texto plano.
Las cuentas legacy requieren migracion de password aparte; no se modifica BD.

## Flujo comprobantes

```text
Flujo de pago existente -> Pedidos -> ComprobanteClient recuperado
  -> FastAPI /api/comprobantes/enviar
  -> reserva exclusiva por pedidoId -> PDF academico -> SMTP (un envio)
  -> {success:true, estado:ENVIADO} -> Pedidos actualiza estadoEmail
Cliente -> Gateway -> FastAPI /api/comprobantes/{UUID}/descargar
```

Se retiro el envio Java duplicado del comprobante. El registro JPA se conserva
como metadatos del pedido; PDF y correo adjunto pertenecen a FastAPI. Los endpoints
Java de prueba SMTP y el correo de bienvenida de Auth permanecen para conservar
funciones existentes; no emiten comprobantes en paralelo.

JSON original conservado: `pedidoId`, `codigoOrden`, `estudiante`, `correo`,
`curso`, `monto`, `tipoComprobante`, `rucCliente`, `razonSocial`. Los campos opcionales
`horario`, `modalidad`, `enlaceClase`, `direccionClase`, `aula` preservan la informacion
de acceso del correo Java anterior. No se inventan RUC, razon social ni destinatarios.

FastAPI mantiene validacion 422, descarga inexistente 404, envio no confirmado 502
y agrega 409 para pedidos repetidos incompatibles o pendientes de conciliacion.
Java exige `success:true` y `estado:ENVIADO`; fallos remotos se traducen a 502 sin
detalles sensibles. La llamada es sincrona para no ocultar errores de envio.
No se modificaron componentes Angular ni su diseno.

## Deduplicacion y limites transaccionales

`PDF_OUTPUT_DIR` contiene PDF y un registro JSON por pedido. Creacion exclusiva
serializa operaciones; hash del cuerpo evita reutilizar un pedido con datos
distintos. Un resultado ENVIADO devuelve la respuesta previa sin regenerar PDF
ni reenviar correo. El registro exitoso se reemplaza atomicamente.

Tras timeout SMTP, cierre del proceso o resultado incierto, el registro permanece
EN_PROCESO. Los reintentos devuelven 409: se prioriza no duplicar envios sobre
reintentar automaticamente. Se necesita conciliacion manual del operador con
el proveedor; no borrar registros indiscriminadamente. Un PDF legacy sin registro
de envio tampoco se sobrescribe ni reenvia automaticamente.

No es una transaccion distribuida. SMTP puede aceptar un mensaje y luego fallar
la respuesta o la transaccion Java. La deduplicacion evita repetir el envio; no
soluciona la conciliacion del pago. Se necesita almacenamiento persistente y
compartido para este directorio si se usan multiples replicas. No se migro BD.

## Configuracion

- Gateway y Pedidos: `COMPROBANTES_SERVICE_URL`, default `http://127.0.0.1:8084`.
- Gateway y Auth: `WHATSAPP_SERVICE_URL`, default `http://127.0.0.1:8085`.
- Node: `PORT` (8085), sesion local `.wwebjs_auth`, dependencias originales y lockfile.
- FastAPI: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`,
  `PDF_OUTPUT_DIR`. `.env.example` solo tiene placeholders; FastAPI original lee
  variables del proceso, no carga `.env` automaticamente.
- No se modificaron filtros JWT/IP ni configuracion CORS existentes.
- Los servicios recuperados no implementaban autenticacion propia. No exponer sus
  puertos directamente a Internet. La politica actual del Gateway solo protege
  `/api/auth/usuarios`; ampliar autorizacion de APIs sigue siendo trabajo pendiente,
  no una proteccion que esta fase pueda afirmar existente.
- Scripts actuales no arrancan los dos servicios recuperados. No ejecutarlos como
  prueba completa; la unificacion del arranque queda pendiente para una fase posterior.

## Validacion ejecutada (actualizada tras autorizacion Maven)

El POM raiz es agregador multimodulo. Se ejecuto primero el comando solicitado:
`mvn -pl auth-service,pedidos-service,gateway-service -am test`, y despues de
ampliar los contratos se repitio con `-B -ntp` (solo formato de salida).
Maven descargo el starter de correo 3.4.3 y dependencias transitivas desde Central.
No se modificaron POM, versiones ni configuracion Java.

Resultado final: BUILD SUCCESS, 36 pruebas unicas aprobadas, 0 fallidas/errores,
0 omitidas. No se suman de nuevo las pruebas repetidas entre ejecuciones.

| Suite | Aprobadas | Fallidas/errores | Omitidas |
|---|---:|---:|---:|
| Auth (servicio + cliente HTTP) | 14 | 0 | 0 |
| Pedidos (cliente HTTP de comprobantes) | 1 | 0 | 0 |
| Gateway (seguridad, configuracion y HTTP) | 11 | 0 | 0 |
| FastAPI (PDF temporal + SMTP simulado) | 6 | 0 | 0 |
| Node (SDK WhatsApp simulado) | 4 | 0 | 0 |

Contratos verificados:
- Auth -> WhatsApp: POST, phone/message, success:true, success:false y HTTP 503;
  errores no exponen OTP ni cuerpo del proveedor.
- Pedidos -> Comprobantes: POST, pedidoId, monto, tipo; respuesta ENVIADO y HTTP 502.
- Gateway -> servicios: peticiones HTTP reales de prueba en loopback y puertos
  efimeros, JSON/metodo/ruta preservados, 503 de WhatsApp y 404 de descarga.
  Destinos de todas las rutas sustituidos; la ruta frontend tiene un stub distinto
  que devuelve 418 para detectar desvios. No se consultan otros servicios locales.
- Python: 6 pruebas repetidas con exito, incluyendo concurrencia e idempotencia.
- Node: 4 pruebas repetidas con exito y `node --check` correcto.

Durante el desarrollo de la prueba HTTP hubo 4 errores de inicializacion:
`Predicate must not be null`. Causa: sobrescribir solo URI en una lista de
propiedades Spring reemplazaba tambien sus predicados. Se corrigio exclusivamente
el fixture conservando IDs/predicados del archivo real. La ejecucion final paso.
No hubo errores de compilacion ni correcciones de codigo productivo en esta validacion.

No se arrancaron Auth/Pedidos contra BD ni se envio SMTP/WhatsApp/Mercado Pago.
Solo se arranco Gateway dentro de la prueba aislada y servidores HTTP simulados.
Las pruebas de clientes Java usan MockRestServiceServer; no son una prueba
extremo a extremo de Java conectado al proceso Python/Node real.

Seguridad de archivos: se revisaron lineas nuevas y archivos sin seguimiento;
solo hay credenciales ficticias explicitas de pruebas/placeholders. No hay POM
modificado, archivos staged, secretos nuevos detectados ni artefactos generados
versionados o pendientes de agregar. target/, generated/, __pycache__ y sesiones
WhatsApp siguen ignorados. Los secretos preexistentes del proyecto no se han
eliminado ni publicado mediante esta validacion.

## Pendientes fuera de este cambio

- Migracion Meta y notificaciones de Pedidos fuera de Java: pospuesta explicitamente
  por el usuario; requiere autorizacion posterior.
- Autorizacion de endpoints y aislamiento de servicios internos.
- Conciliar comprobantes Java historicos sin PDF, sin reenvios masivos automaticos.
- Falsos exitos locales Angular, confirmacion del proveedor de pago, aforo y
  transacciones distribuidas: permanecen fuera de la fase; no declarar flujo real validado.
- Verificar el despliegue real con credenciales y permisos especificos posteriormente.

## Inventario final de archivos

```text
 M .gitignore
 M auth-service/src/main/java/com/curso/auth/client/WhatsappOtpClient.java
 M auth-service/src/main/java/com/curso/auth/service/AuthService.java
 M auth-service/src/test/java/com/curso/auth/service/AuthServiceTest.java
 M gateway-service/src/main/resources/application.properties
 M pedidos-service/src/main/java/com/curso/pedidos/controller/ApiExceptionHandler.java
 M pedidos-service/src/main/java/com/curso/pedidos/service/NotificacionEmailService.java
 M pedidos-service/src/main/java/com/curso/pedidos/service/PedidoService.java
 M pedidos-service/src/main/resources/application.properties
?? auth-service/src/test/java/com/curso/auth/client/WhatsappOtpClientTest.java
?? comprobantes-service/.env.example
?? comprobantes-service/.gitignore
?? comprobantes-service/Dockerfile
?? comprobantes-service/README.md
?? comprobantes-service/app/__init__.py
?? comprobantes-service/app/main.py
?? comprobantes-service/requirements.txt
?? comprobantes-service/tests/test_contract.py
?? docs/fase-1-recuperacion.md
?? gateway-service/src/test/java/com/curso/gateway/security/RestoredRoutesHttpTest.java
?? gateway-service/src/test/java/com/curso/gateway/security/RestoredRoutesTest.java
?? pedidos-service/src/main/java/com/curso/pedidos/client/ComprobanteClient.java
?? pedidos-service/src/main/java/com/curso/pedidos/exception/RemoteServiceException.java
?? pedidos-service/src/test/java/com/curso/pedidos/client/ComprobanteClientTest.java
?? whatsapp-service/.gitignore
?? whatsapp-service/package-lock.json
?? whatsapp-service/package.json
?? whatsapp-service/src/index.js
?? whatsapp-service/test/contract.test.js
```
