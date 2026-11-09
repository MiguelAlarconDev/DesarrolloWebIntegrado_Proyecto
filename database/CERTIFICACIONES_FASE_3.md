# Fase 3 — Emisión de certificados académicos

Flujo completo **DOCENTE → ADMIN → ESTUDIANTE**. Migración manual: `migracion_certificaciones_fase_3.sql`. **No se ejecutó en Supabase.**

## Orden de migraciones (manual, con respaldo y autorización)

1. `migracion_aula_virtual_fase_a.sql`
2. `migracion_aula_virtual_e2.sql`
3. `migracion_certificaciones_fase_2.sql` — revisión académica y coordinación por curso; los escritores del aula la requieren.
4. `migracion_certificaciones_fase_3.sql` — certificados y su historial.

Ejecutar cada una con `psql -X -v ON_ERROR_STOP=1 -f <archivo>` (Session pooler, sin `-1`) y con el rol propietario que usa el backend. Ninguna es idempotente: un segundo intento falla dentro de su transacción sin cambiar nada.

## Endpoints

Base `/api/cursos/certificados`. Usa la ruta `/api/cursos/**` que el Gateway ya tiene, así que no hace falta una ruta nueva. Todas las respuestas privadas llevan `Cache-Control: no-store`.

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/admin/emisiones` `{cursoId, estudianteId}` + `Idempotency-Key` (UUID) | ADMIN |
| GET | `/admin/aprobados?page&size` (decisiones APROBADO con revisión vigente) | ADMIN |
| GET | `/admin?page&size`, `/admin/{id}/eventos` | ADMIN |
| GET | `/mios` (solo EMITIDOS del estudiante autenticado) | ESTUDIANTE |
| GET | `/{id}/descarga` (URL firmada de 60 s) | Propietario (ESTUDIANTE) o ADMIN; un certificado ajeno responde 404 |
| GET | `/verificacion/{codigo}` (nombre enmascarado, curso, fecha, SHA-256 del PDF) | Público |

**ADMIN sigue sin acceso al aula.** El docente usa los endpoints de Fase 1 (`/aula/recomendaciones/{est}`) y de Fase 2 (`/aula/aprobaciones/{est}`) sin cambios. El Gateway ahora admite la cabecera `Idempotency-Key` en CORS; sin ella, el navegador rechazaba las decisiones y emisiones hechas desde Angular.

## Emisión (CertificadoService + ValidadorEmision)

1. **Fase A, en la misma transacción:** revalida la matrícula PAGADO y, con el bloqueo del curso, que la decisión sea APROBADO con la misma revisión y el mismo hash. Además:
   - comprueba que no exista un certificado activo para ese curso y estudiante;
   - genera un código único `DWI-XXXX-XXXX-XXXX` (60 bits, alfabeto Crockford) y el PDF;
   - guarda el certificado en PENDIENTE junto con el evento `EMISION_INICIADA`.
2. **Subida del PDF** al bucket privado (`certificados/{curso}/{estudiante}/{uuid}.pdf`), sin ningún bloqueo de base de datos.
3. **Fase B:** vuelve a hacer la validación completa (matrícula y vigencia) y pasa el certificado a EMITIDO (evento `EMITIDO`). Si la aprobación cambió durante la subida, o si Storage falla, queda en FALLIDO y se elimina el objeto.

**Garantías:**
- **Un certificado activo:** un índice único parcial impide dos certificados activos (PENDIENTE o EMITIDO) por curso y estudiante, también ante emisiones concurrentes.
- **Idempotencia:** (emisor, `Idempotency-Key`) devuelve el certificado original en su estado real. Usar la misma clave para otra solicitud responde 409.
- **Emisión abandonada:** un PENDIENTE de más de 5 minutos (por caída del proceso) pasa a FALLIDO en la siguiente emisión y su objeto se elimina.
- **Integridad en la base:** triggers solo permiten PENDIENTE → EMITIDO | FALLIDO. Los demás campos, la eliminación y el historial de eventos son inmutables.
- **Acceso:** RLS sin políticas y privilegios revocados de PUBLIC, `anon` y `authenticated`.
- **El PDF:** PDF 1.4 generado sin dependencias nuevas (Helvetica, WinAnsi) y determinista. Incluye estudiante, curso, fecha (hora de Lima), código, URL de verificación y huella de la evidencia. Su SHA-256 se guarda y se publica en la verificación.
- **No se emite** para NO_APROBADO, REVOCADO, decisiones desactualizadas, estudiantes sin decisión o sin matrícula PAGADO.

## Configuración

- **Ya existentes:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_STORAGE_BUCKET`. La emisión usa el único cliente de Storage (`SupabaseStorageClient`), es decir, **el mismo bucket privado que el aula** (por defecto `aula-materiales`), con objetos `certificados/{curso}/{estudiante}/{uuid}.pdf`. No requiere un bucket adicional; el bucket debe ser privado, admitir `application/pdf` y un límite de al menos 10 MB.
- **Nombre del estudiante:** se obtiene de auth-service con un token SERVICE de corta duración. URL `services.auth.url` o `AUTH_SERVICE_URL`; por defecto `http://127.0.0.1:8081`.
- **URL de verificación** impresa en el PDF: `CERTIFICADOS_URL_VERIFICACION`; por defecto `http://localhost:4200/verificar-certificado`.

## Angular

- **Docente:** la sección «Certificación académica» dentro del aula del curso. Muestra los estudiantes con pago, la recomendación (promedio y estado), la evidencia y la decisión vigente con una advertencia si cambió. Permite aprobar o no aprobar con justificación, revocar y ver el historial.
- **ADMIN:** la pestaña «Certificaciones» lleva a `/portal-admin/certificaciones`, con los aprobados vigentes, la emisión individual, los certificados y su historial, y la descarga.
- **Estudiante:** el botón «Mis certificados» lleva a `/mis-cursos/certificados`, con la lista y la descarga.
- **Público:** `/verificar-certificado?codigo=`.
- **Idempotencia:** la clave se conserva mientras se reintenta la misma acción y se descarta al terminar o ante un 409.

## Validación (2026-11-09)

- **cursos-service con PostgreSQL 18 aislado** (127.0.0.1:55439/55441/55442; ninguna conexión a Supabase): `CertificadoPostgresTest` (8), `AprobacionPostgresTest` (15) y regresiones del aula y las recomendaciones. Storage simulado en memoria; Auth y Pedidos simulados.
- **Unitarias y HTTP:** `GeneradorPdfCertificadoTest` (4) y `CertificadoHttpTest` (6, con el filtro JWT real).
- **gateway-service:** 13, incluida la prueba de CORS con `Idempotency-Key`.
- **Angular:** `ng build` de producción. El proyecto no tiene un runner de pruebas unitarias configurado. Se verificó `CertificadosService` compilándolo con esbuild y ejecutándolo en Node con una API simulada (23 comprobaciones de URL, cabeceras, idempotencia y mensajes), sin agregar dependencias al proyecto.

## Limitaciones conocidas

- **Pedidos es otro servicio:** un reembolso entre la revalidación y el commit no se detecta (no se modifica Pedidos).
- **Anulación:** no existe anulación de un certificado ya emitido. Revocar después la decisión no invalida el certificado; está pendiente de diseño.
- **Envío por correo:** no está implementado (fuera de alcance).
- **Objetos huérfanos:** si también falla su limpieza en Storage, se registra en el log y no hay un proceso que los elimine.
- **Verificación pública:** expone el curso y el nombre enmascarado. El código tiene 60 bits aleatorios, así que no se puede enumerar en la práctica.
