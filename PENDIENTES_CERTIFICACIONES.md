# Certificaciones académicas: estado y pendientes

Entrega del 2026-11-09, rama `feature/certificaciones-academicas` integrada en `develop`.

> **Estado: incompleto.** El flujo se probó solo hasta el panel ADMIN. **La emisión real falla.** Tampoco están validadas la descarga del PDF ni la verificación pública con un certificado real.

## ⚠️ Advertencias

- **No repetir las migraciones.** Las cuatro ya están aplicadas en Supabase (`ptbxgwmjxetfyuvgjmad`) y ninguna es idempotente.
- **No exponer credenciales.** `.env` es privado y está en `.gitignore`. La clave `service_role` es solo para el backend: nunca va en el frontend, en commits, en capturas ni en logs.
- No probar contra datos reales sin respaldo previo. Un certificado EMITIDO es inmutable por diseño (lo garantizan triggers), y por ahora no existe la anulación.

## Funcionalidades implementadas

| Fase | Contenido | Commit |
|---|---|---|
| 1 | Recomendaciones académicas: promedio y estado por estudiante, a partir de tareas y calificaciones | `440662a` |
| 2 | Decisiones del docente (aprobar, no aprobar, revocar) con justificación. Revisión académica monotónica por curso, evidencia canónica `evidencia-academica/v2` con SHA-256 e historial | `2afac66` |
| 3 | Emisión de certificados PDF por el ADMIN, descarga (URL firmada de 60 s), "Mis certificados" del estudiante y verificación pública por código `DWI-XXXX-XXXX-XXXX` | `9a4c3d7` |
| Fix | `@Autowired` en el constructor público de `CertificadoService`. La clase tiene dos constructores y, sin la anotación, Spring no podía instanciarla al arrancar | (este commit) |

El detalle técnico está en `database/CERTIFICACIONES_FASE_2.md` y `database/CERTIFICACIONES_FASE_3.md`.

## Migraciones ya aplicadas en Supabase (NO repetir)

Se aplicaron en este orden:

1. `database/migracion_aula_virtual_fase_a.sql`
2. `database/migracion_aula_virtual_e2.sql`
3. `database/migracion_certificaciones_fase_2.sql`
4. `database/migracion_certificaciones_fase_3.sql`

Después de aplicarlas se verificaron tablas, constraints, triggers, RLS y la revocación de privilegios a `anon` y `authenticated`. Existe un respaldo previo en formato custom (`pg_dump`), guardado fuera del repositorio.

## Estado de las pruebas

**Automatizadas (en local, sin Supabase):**
- `cursos-service` contra un PostgreSQL 18 aislado: `CertificadoPostgresTest`, `AprobacionPostgresTest` y las regresiones del aula. Necesitan los flags `-Dcertificados.postgres.test=true` y `-Daprobaciones.postgres.test=true`, además de un clúster local; sin ellos se omiten.
- Unitarias y HTTP: `GeneradorPdfCertificadoTest` y `CertificadoHttpTest` (con el filtro JWT real).
- `gateway-service`: incluye la prueba de CORS con `Idempotency-Key`.
- Angular: `ng build` de producción. El proyecto no tiene un runner de pruebas unitarias.
- **Limitación:** en estas pruebas, Storage, Auth y Pedidos están simulados. Nunca se probó la subida real a Supabase Storage.

**Manuales (entorno local conectado a Supabase):**
- ✅ Arrancan los 7 servicios.
- ✅ El docente ve las calificaciones y la sección «Certificación académica».
- ✅ Carlos Estudiante aparece como APROBADO en `/portal-admin/certificaciones`.
- ❌ Falla la emisión (ver la sección siguiente).
- ⏳ Sin validar: la descarga del PDF, «Mis certificados» y la verificación pública con un código real.

## Error de emisión observado (panel ADMIN)

**Síntoma:** al pulsar «Emitir», el botón muestra «Emitiendo…» y luego aparece «La emisión anterior con esta solicitud falló. Vuelve a intentarlo.». Es el mensaje que muestra `certificados-admin.component.ts` cuando el backend devuelve el certificado en estado `FALLIDO`.

**Evidencia en `.run/logs/cursos.log`:**
```
WARN SupabaseStorageClient : [STORAGE] Subida fallida: IllegalArgumentException
WARN SupabaseStorageClient : [STORAGE] Eliminacion fallida: IllegalArgumentException
WARN CertificadoService    : [CERTIFICADOS] Limpieza de almacenamiento pendiente; verificar inventario privado
```

La reserva PENDIENTE y la generación del PDF funcionan. Lo que falla es la subida a Storage, así que el certificado pasa a FALLIDO, que es el comportamiento diseñado.

**Causa probable (sin corregir):** en el `.env` local, el valor de `SUPABASE_URL` repite el nombre de la variable. La línea es `SUPABASE_URL=SUPABASE_URL=https://...` en lugar de `SUPABASE_URL=https://<ref>.supabase.co`. `SupabaseStorageClient` construye la URL con `URI.create(...)` y recibe un esquema inválido, por eso lanza `IllegalArgumentException`. La clave `service_role` sí tiene la forma esperada (JWT).

**Pasos para reproducir:**
1. Arrancar con `.\iniciar_servicios.ps1`, con el `.env` actual.
2. Como DOCENTE, aprobar al estudiante en «Certificación académica» (ya está hecho con Carlos Estudiante).
3. Como ADMIN, ir a `/portal-admin/certificaciones`, pestaña «Aprobados» → «Emitir».
4. Ver el mensaje de error y las líneas `[STORAGE] Subida fallida` en `.run/logs/cursos.log`.
5. En «Certificados» aparecerá un registro FALLIDO por cada intento. Es normal: el índice único solo considera los certificados activos, así que se puede reintentar.

## Archivos y servicios relevantes

- **cursos-service (8082), paquete `com.cursos.certificaciones`:**
  - `CertificadoService`: emisión en dos fases e idempotencia.
  - `ValidadorEmision`, `GeneradorPdfCertificado`, `CertificadoController` (base `/api/cursos/certificados`).
  - `UsuarioClient`: obtiene el nombre del estudiante desde auth-service.
  - `AprobacionService`, `RevisionAcademica`, `EvidenciaAcademica`.
- **cursos-service, Storage:** `com.cursos.aula.SupabaseStorageClient`. Usa el bucket privado `SUPABASE_STORAGE_BUCKET` (`aula-materiales`) con el prefijo `certificados/`.
- **cursos-service, seguridad:** `com.cursos.security.JwtAuthFilter`, con las reglas de acceso de `/certificados/**`.
- **gateway-service (8080):** `CorsFilter` (cabecera `Idempotency-Key`).
- **auth-service (8081):** devuelve los nombres de usuario a partir de un token SERVICE.
- **Frontend Angular (4200):**
  - `services/certificados.service.ts`
  - `pages/admin-panel/certificados-admin.component.ts`
  - `pages/aula-docente/certificacion-docente.component.ts`
  - `pages/aula-estudiante/mis-certificados.component.ts`
  - `verificar-certificado.component.ts`
- **Base de datos:** `database/migracion_certificaciones_fase_2.sql` y `database/migracion_certificaciones_fase_3.sql`, con su documentación `CERTIFICACIONES_FASE_*.md`.
- **Configuración:**
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_STORAGE_BUCKET`.
  - `CERTIFICADOS_URL_VERIFICACION`: por defecto `http://localhost:4200/verificar-certificado`.
  - `AUTH_SERVICE_URL`: por defecto `http://127.0.0.1:8081`.

  Hay plantilla en `.env.example`.

## Recomendaciones para continuar

1. **Corregir la causa probable en el `.env` local** de quien ejecute las pruebas (sin subirlo):
   - Dejar `SUPABASE_URL=https://<ref>.supabase.co`, sin repetir el nombre de la variable ni agregar rutas como `/rest/v1`.
   - Reiniciar con `.\detener_servicios.ps1` y luego `.\iniciar_servicios.ps1`.
2. **Comprobar el bucket** `aula-materiales` en Supabase: debe ser privado, admitir `application/pdf` y aceptar archivos de al menos 10 MB.
3. **Reintentar la emisión desde el panel ADMIN.** Si sigue fallando, revisar el tipo de excepción en `cursos.log`:
   - `IllegalArgumentException`: la URL sigue mal formada.
   - 401 o 403: la clave o el bucket son incorrectos.
   - 404: el bucket no existe.
   - Timeout: problema de red.
4. **Validar el resto del flujo:**
   - La descarga como ADMIN y como estudiante («Mis certificados»).
   - La verificación pública en `/verificar-certificado?codigo=...`.
   - Que un certificado ajeno responda 404.
   - Que repetir la emisión de un certificado activo responda 409.
5. **Pendientes de diseño (fuera de esta entrega):**
   - Anulación de certificados emitidos.
   - Un proceso que limpie los objetos huérfanos de Storage.
   - Detección de reembolsos en Pedidos entre la revalidación y el commit.
   - Envío del certificado por correo.
6. **Mejora sugerida de UX (no implementada):** el mensaje «La emisión anterior con esta solicitud falló» no explica la causa. Conviene mostrar un texto como «No se pudo guardar el PDF; revisa la configuración de almacenamiento».
7. **WhatsApp (2FA y notificaciones):** el servicio está OFFLINE y espera que se escanee un QR (`.run/logs/whatsapp.log`). Las cuentas de prueba tienen la 2FA desactivada, así que su login no se ve afectado.
