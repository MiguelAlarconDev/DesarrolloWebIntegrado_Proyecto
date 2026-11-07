# Aula virtual — Fases B, C y D

Continúa `AULA_VIRTUAL_FASE_A.md`. **Validado solo con pruebas automatizadas y simuladas.** No hubo conexión a Supabase (ni base de datos ni Storage), no se creó ningún bucket y no se subió ningún archivo real. No hay validación E2E real.

## Fase B — Backend y Supabase Storage (cursos-service)

### Endpoints nuevos

Todos van bajo `/api/cursos/{cursoId}/aula/modulos/{moduloId}` y devuelven `Cache-Control: no-store`.

| Método | Ruta | Acceso | Respuesta |
|---|---|---|---|
| POST multipart | `/materiales` (campo `archivo`; `titulo` opcional) | Docente asignado | 201 con el material, sin `object_key` |
| DELETE | `/materiales/{materialId}` | Docente asignado | 204 |
| GET | `/materiales/{materialId}/descarga` | Docente asignado o estudiante con pedido PAGADO | 200 `{url, expiraEn, nombreArchivo}`; la URL firmada dura 60 s |

`GET /aula` agrega `publicadoEn` a cada material. Los endpoints de la Fase A no cambian.

### Validación de archivos (`ValidadorArchivo`)

- **Tamaño:** entre 1 byte y 10 MiB (10.485.760 bytes).
- **Extensión permitida:** pdf, docx, pptx, zip.
- **Content-Type declarado:** debe ser coherente con la extensión. Se admite `application/octet-stream` y los alias habituales de ZIP. En la base se guarda siempre el MIME canónico.
- **Firma binaria (magic bytes):** `%PDF-` para PDF y `PK\x03\x04` para los formatos basados en ZIP.
- **Estructura interna:** se lee solo el directorio central del ZIP, sin descomprimir, para no exponerse a bombas ZIP.
  - DOCX debe contener `[Content_Types].xml` y `word/document.xml`.
  - PPTX debe contener `[Content_Types].xml` y `ppt/presentation.xml`.
  - Se rechazan documentos con macros (`vbaProject.bin`) y ZIP con más de 5.000 entradas.
- **Nombre:** se eliminan las rutas y los caracteres de control, con un máximo de 255 caracteres.
- **Clave del objeto:** la genera el backend: `cursos/{cursoId}/modulos/{moduloId}/{UUID}.{ext}`.
- **Fuera de alcance:** la validación es estructural; no hay antivirus.

### Flujos y compensación

- **Subida:**
  1. Autorización y pertenencia del módulo al curso.
  2. Validación del archivo.
  3. Registro `PENDIENTE` en la base.
  4. Subida a Storage (`x-upsert: false`).
  5. Cambio a `ACTIVO`.

  Si Storage falla, se borra el registro `PENDIENTE` y se responde 503. Si falla la activación, se borran el objeto y el registro y se responde 503. Mientras está en `PENDIENTE`, el material nunca se lista ni se descarga.
- **Eliminación:**
  1. Se marca `ELIMINACION_PENDIENTE` (deja de mostrarse).
  2. Se elimina el objeto en Storage (si ya no existe, el 404 cuenta como éxito).
  3. Se borra el registro.

  Si Storage falla, se responde 503 y el material queda oculto; repetir el mismo DELETE lo completa.
- **Descarga:** siempre comprueba material → módulo → curso. Solo materiales `ACTIVO`. Si la verificación de matrícula falla (Pedidos caído), responde 503 y no entrega URL.
- **Logs:** solo registran códigos HTTP e identificadores internos; nunca URLs firmadas, claves de objeto ni credenciales.

### Límites de subida y Gateway

- **cursos-service:** `spring.servlet.multipart.max-file-size=10MB` (10.485.760 bytes) y `max-request-size=11MB`. Si se superan, responde 413.
- **gateway-service:** `spring.servlet.multipart.enabled=false`. Por defecto Spring interpretaba el multipart con un límite de 1 MB y consumía el cuerpo; ahora lo reenvía intacto. Lo comprueba `AulaMultipartGatewayTest`: unos 10 MiB llegan byte a byte (mismo SHA-256) a un servidor local de prueba.

## Variables de entorno (solo en el backend, cursos-service)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `SUPABASE_URL` | Sí, para usar materiales | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí, para usar materiales | Clave `service_role`. **Secreta:** nunca en el frontend, en el repositorio ni en logs |
| `SUPABASE_STORAGE_BUCKET` | No | Por defecto `aula-materiales` |
| `JWT_SECRET`, `DB_*`, `SERVICES_PEDIDOS_URL` | Ya existentes | Sin cambios |

Sin `SUPABASE_URL` o sin la clave, la subida, la eliminación y la descarga responden 503 sin escribir nada. El listado y la gestión de módulos siguen funcionando.

Para definir la clave sin que se vea, en PowerShell, antes de `iniciar_servicios.ps1`:
```powershell
$s = Read-Host 'service_role' -AsSecureString
$env:SUPABASE_SERVICE_ROLE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
```

## Configuración manual pendiente en Supabase (requiere autorización)

1. **Aplicar** `database/migracion_aula_virtual_fase_a.sql`, que sigue pendiente. Antes, hacer un respaldo y verificar el rol JDBC y RLS como indica la Fase A. Sin estas tablas, los endpoints del aula fallan en la base real.
2. **Storage → crear el bucket** `aula-materiales`:
   - **Public bucket: desactivado.**
   - File size limit: 10 MB.
   - Allowed MIME types: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `application/zip`.
3. **No crear políticas** sobre `storage.objects` para `anon` ni `authenticated` en ese bucket. Solo el backend accede, con `service_role`.
4. **Copiar** Project URL y `service_role` desde Settings → API a las variables del backend.

## Fase C — Portal docente (`/portal-docente/aula/:cursoId`)

- **Acceso:** botón «Gestionar materiales» en cada tarjeta de curso. Solo se inserta el UUID del curso y se valida con una expresión regular.
- **Módulos:** muestra el nombre del curso y sus módulos; se pueden crear y editar nombre y orden en línea.
- **Materiales:**
  - subida por módulo (con título opcional);
  - tabla con título, archivo, formato, tamaño y fecha de publicación;
  - descarga, y eliminación con confirmación en línea.
- **Estados:** indicadores de carga, mensajes de éxito y error, estados vacíos y diseño responsive.
- **Seguridad del template:** solo interpolación y bindings de Angular, sin `innerHTML`.
- **`ApiService`:** acepta `FormData` sin forzar `Content-Type` (el navegador fija el boundary) y un `timeoutMs` opcional (subidas de 120 s).

## Fase D — Portal estudiante (`/mis-cursos/aula/:cursoId`)

- **Acceso:** botón «Aula Virtual» en los cursos pagados de Mis Cursos.
- **Solo lectura:** módulos y materiales con descarga; sin controles del docente.
- **Estados:** carga, vacío y error.
  - Mensajes específicos para 401, 403 (matrícula no pagada), 404 y 503.
  - Reintento solo cuando tiene sentido (503 o error de red).
- **Autorización:** la decide siempre el backend en cada petición; no se usa sessionStorage para ello. El detalle público del curso no cambia.

## Pruebas (ejecutadas el 2026-11-07)

- **cursos-service:** 55 ejecutadas, 0 fallos, 1 omitida (`AulaPostgresTest`, que requiere un cluster aislado).
  - `ValidadorArchivoTest`: 7.
  - `SupabaseStorageClientTest`: 5, con `MockRestServiceServer`.
  - `AulaMaterialesHttpTest`: 18, con el filtro JWT real y Storage y Pedidos simulados.
  - `AulaHttpTest` (Fase A): 14.
- **pedidos-service:** 44/44.
- **gateway-service:** 12/12, incluido el proxy multipart.
- **Angular:** `ng build` de producción OK. El proyecto no tiene pruebas unitarias de frontend configuradas.

## Riesgos y limitaciones

- **No hay validación E2E real** con Supabase Storage ni con la base real.
- **Huérfanos:** si también falla una compensación, puede quedar un registro `PENDIENTE` u objeto oculto. Se registra en el log, pero no hay un proceso que los limpie.
- **Reintento de borrado:** un material en `ELIMINACION_PENDIENTE` no aparece en la interfaz. Reintentarlo requiere repetir el DELETE desde otra herramienta o una tarea futura.
- **URL firmada:** cualquiera que tenga la URL puede usarla durante 60 s; es inherente al modelo de URL firmada.
- **Límite de 413 del servlet:** no se probó en el servlet real; las pruebas cubren la validación del controlador y del validador.
- **`iniciar_servicios.ps1`:** no borra `SUPABASE_SERVICE_ROLE_KEY` de la sesión después del arranque.

## Probar localmente

1. Aplicar la migración en una base **aislada** y configurar el bucket privado en un proyecto Supabase **de prueba**.
2. Definir `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y, si hace falta, `SUPABASE_STORAGE_BUCKET`, y luego ejecutar `.\iniciar_servicios.ps1`.
3. **Docente asignado:** Portal docente → «Gestionar materiales» → crear «Semana 1» → subir un PDF → descargar → eliminar.
4. **Estudiante con pedido PAGADO de ese curso:** Mis Cursos → «Aula Virtual» → ver el material y descargarlo.
5. **Comprobar los rechazos:**
   - otro docente: 403;
   - un estudiante sin pago: 403;
   - sin sesión: 401;
   - un archivo `.exe` o un PDF falso: 400;
   - más de 10 MB: 400 o 413.
