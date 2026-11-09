package com.cursos.certificaciones;

import com.cursos.aula.AlmacenamientoArchivos;
import com.cursos.repository.CursoRepository;
import com.cursos.security.AuthPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Emision de certificados academicos (solo ADMIN) y consulta por el estudiante propietario.
 *
 * Emision en dos fases, ambas a traves de {@link ValidadorEmision} (matricula PAGADO revalidada
 * y, bajo el bloqueo del curso, decision APROBADO vigente con revision y hash identicos):
 *   1. Reserva PENDIENTE con codigo unico y PDF generado (sin E/S externa con bloqueos).
 *   2. Subida del PDF a Storage privado (sin bloqueos de BD).
 *   3. Nueva validacion completa y transicion PENDIENTE -> EMITIDO. Si la aprobacion dejo de
 *      estar vigente durante la subida, el certificado queda FALLIDO y se elimina el objeto.
 * Un indice unico parcial impide dos certificados activos por curso/estudiante; la clave de
 * idempotencia (por emisor) devuelve el mismo certificado en reintentos.
 */
@Service
public class CertificadoService {
    private static final Logger log = LoggerFactory.getLogger(CertificadoService.class);
    static final Duration PENDIENTE_ABANDONADO = Duration.ofMinutes(5);
    static final Duration VIGENCIA_DESCARGA = Duration.ofSeconds(60);
    private static final char[] BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ".toCharArray();
    private static final SecureRandom RANDOM = new SecureRandom();

    private final ValidadorEmision validador;
    private final CertificadoRepository certificados;
    private final CertificadoEventoRepository eventos;
    private final CursoRepository cursos;
    private final UsuarioClient usuarios;
    private final AlmacenamientoArchivos storage;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final Clock clock;
    private final String urlVerificacion;

    public CertificadoService(ValidadorEmision validador, CertificadoRepository certificados, CertificadoEventoRepository eventos,
                              CursoRepository cursos, UsuarioClient usuarios, AlmacenamientoArchivos storage, JdbcTemplate jdbc,
                              PlatformTransactionManager manager,
                              @Value("${certificados.url-verificacion:${CERTIFICADOS_URL_VERIFICACION:http://localhost:4200/verificar-certificado}}") String urlVerificacion) {
        this(validador, certificados, eventos, cursos, usuarios, storage, jdbc, manager, urlVerificacion, Clock.systemUTC());
    }

    CertificadoService(ValidadorEmision validador, CertificadoRepository certificados, CertificadoEventoRepository eventos,
                       CursoRepository cursos, UsuarioClient usuarios, AlmacenamientoArchivos storage, JdbcTemplate jdbc,
                       PlatformTransactionManager manager, String urlVerificacion, Clock clock) {
        this.validador = validador; this.certificados = certificados; this.eventos = eventos; this.cursos = cursos;
        this.usuarios = usuarios; this.storage = storage; this.jdbc = jdbc; this.clock = clock;
        this.urlVerificacion = urlVerificacion;
        tx = new TransactionTemplate(manager);
        tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        tx.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        tx.setTimeout(10);
    }

    // ------------------------------------------------------------------ vistas
    public record Vista(UUID id, String codigo, UUID cursoId, String cursoTitulo, UUID estudianteId, String estudianteNombre,
                        Certificado.Estado estado, Instant fechaEmision, long revisionAcademica, String pdfSha256, long tamanoBytes) {
        static Vista of(Certificado c) {
            return new Vista(c.getId(), c.getCodigo(), c.getCursoId(), c.getCursoTitulo(), c.getEstudianteId(), c.getEstudianteNombre(),
                    c.getEstado(), c.getFechaEmision(), c.getRevisionAcademica(), c.getPdfSha256(), c.getTamanoBytes());
        }
    }
    public record Pagina<T>(List<T> items, int page, int size, long totalElements, int totalPages) {}
    public record Aprobado(UUID cursoId, String cursoTitulo, UUID estudianteId, String estudianteNombre, Instant decididoEn,
                           long revisionAcademica, UUID certificadoId, String certificadoCodigo, Certificado.Estado certificadoEstado) {}
    public record Evento(CertificadoEvento.Tipo evento, UUID actor, String detalle, Instant fecha) {}
    public record Descarga(String url, Instant expiraEn, String nombreArchivo) {}
    public record Verificacion(String codigo, boolean valido, String estado, String estudiante, String cursoTitulo,
                               Instant fechaEmision, String pdfSha256) {}

    private record Preparado(Certificado certificado, byte[] pdf, String abandonadoKey) {}

    // ------------------------------------------------------------------ emision (ADMIN)
    public Vista emitir(UUID curso, UUID estudiante, UUID clave, AuthPrincipal admin) {
        if (curso == null || estudiante == null || clave == null) throw error(HttpStatus.BAD_REQUEST, "Curso, estudiante e Idempotency-Key son obligatorios");
        UUID emisor = UUID.fromString(admin.subject());

        // Reintento idempotente: devuelve el certificado original en el estado en que este.
        var previo = certificados.findByEmitidoPorAndIdempotencia(emisor, clave);
        if (previo.isPresent()) return idempotente(previo.get(), curso, estudiante);

        String titulo = cursos.findById(curso).map(c -> c.getTitulo()).filter(t -> t != null && !t.isBlank())
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Curso no encontrado"));
        String nombre = usuarios.nombre(estudiante).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Estudiante no encontrado"));

        // Fase 1: validacion completa bajo bloqueo del curso y reserva PENDIENTE.
        Preparado p;
        try {
            p = validador.conAprobacionVigente(curso, estudiante, v -> reservar(v, clave, emisor, nombre, titulo));
        } catch (DataIntegrityViolationException ex) {
            var ganador = certificados.findByEmitidoPorAndIdempotencia(emisor, clave);
            if (ganador.isPresent()) return idempotente(ganador.get(), curso, estudiante);
            throw error(HttpStatus.CONFLICT, "Ya existe un certificado activo o una emision en curso para este estudiante");
        }
        if (p.certificado().getEstado() != Certificado.Estado.PENDIENTE) return Vista.of(p.certificado());
        if (p.abandonadoKey() != null) limpiar(p.abandonadoKey());
        Certificado cert = p.certificado();

        // Fase 2: subida sin bloqueos de base de datos.
        try {
            storage.subir(cert.getObjectKey(), p.pdf(), "application/pdf");
        } catch (RuntimeException ex) {
            // El proveedor pudo guardar el objeto antes de fallar: se borra solo si FALLIDO queda confirmado.
            if (fallar(cert.getId(), curso, emisor, "Fallo al guardar el PDF en el almacenamiento")) limpiar(cert.getObjectKey());
            throw new AlmacenamientoArchivos.NoDisponibleException("No se pudo guardar el certificado; reintente con una nueva clave");
        }

        // Fase 3: revalidacion completa (matricula y vigencia) y confirmacion.
        try {
            return validador.conAprobacionVigente(curso, estudiante, v -> confirmar(v, cert.getId(), emisor));
        } catch (RuntimeException ex) {
            // La excepcion puede llegar DESPUES de confirmar EMITIDO (p. ej. conexion perdida tras el commit).
            // Solo se elimina el PDF si la base confirma que el certificado quedo FALLIDO.
            if (fallar(cert.getId(), curso, emisor, "Revalidacion fallida: " + ex.getMessage())) limpiar(cert.getObjectKey());
            throw ex;
        }
    }

    private Vista idempotente(Certificado c, UUID curso, UUID estudiante) {
        if (!c.getCursoId().equals(curso) || !c.getEstudianteId().equals(estudiante))
            throw error(HttpStatus.CONFLICT, "Idempotency-Key reutilizada con otra solicitud");
        return Vista.of(c);
    }

    /** Dentro de la transaccion de ValidadorEmision (bloqueo del curso ya adquirido). */
    private Preparado reservar(ValidadorEmision.AprobacionVigente v, UUID clave, UUID emisor, String nombre, String titulo) {
        jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended(?,0))", (rs, n) -> 0, "certificado:" + emisor + ":" + clave);
        var mismo = certificados.findByEmitidoPorAndIdempotencia(emisor, clave);
        if (mismo.isPresent()) {
            if (!mismo.get().getCursoId().equals(v.cursoId()) || !mismo.get().getEstudianteId().equals(v.estudianteId()))
                throw error(HttpStatus.CONFLICT, "Idempotency-Key reutilizada con otra solicitud");
            return new Preparado(mismo.get(), null, null);
        }
        Instant ahora = clock.instant().truncatedTo(ChronoUnit.MICROS);
        String abandonado = null;
        var activo = certificados.activo(v.cursoId(), v.estudianteId());
        if (activo.isPresent()) {
            Certificado a = activo.get();
            if (a.getEstado() == Certificado.Estado.EMITIDO)
                throw error(HttpStatus.CONFLICT, "El estudiante ya tiene un certificado emitido para este curso (" + a.getCodigo() + ")");
            if (a.getCreatedAt().plus(PENDIENTE_ABANDONADO).isAfter(ahora))
                throw error(HttpStatus.CONFLICT, "Hay una emision en curso para este estudiante; intente en unos minutos");
            a.fallar(ahora); // emision abandonada (caida del proceso): se libera para reintentar
            certificados.saveAndFlush(a);
            eventos.save(new CertificadoEvento(a.getId(), CertificadoEvento.Tipo.FALLIDO, emisor, "Emision abandonada reemplazada", ahora));
            abandonado = a.getObjectKey();
        }
        String codigo = nuevoCodigo();
        String key = "certificados/" + v.cursoId() + "/" + v.estudianteId() + "/" + UUID.randomUUID() + ".pdf";
        byte[] pdf = GeneradorPdfCertificado.generar(new GeneradorPdfCertificado.Datos(codigo, nombre, titulo, ahora,
                v.evidenciaHash(), urlVerificacion + "?codigo=" + codigo));
        Certificado c = new Certificado(codigo, v.cursoId(), v.estudianteId(), v.aprobacionId(), v.revisionId(), v.revisionAcademica(),
                v.evidenciaHash(), nombre, titulo, emisor, clave, ahora, key, sha256(pdf), pdf.length);
        certificados.saveAndFlush(c);
        eventos.save(new CertificadoEvento(c.getId(), CertificadoEvento.Tipo.EMISION_INICIADA, emisor,
                "Aprobacion v" + v.version() + ", revision academica " + v.revisionAcademica(), ahora));
        return new Preparado(c, pdf, abandonado);
    }

    /** Dentro de la transaccion de ValidadorEmision tras la subida. */
    private Vista confirmar(ValidadorEmision.AprobacionVigente v, UUID id, UUID emisor) {
        Certificado c = certificados.findById(id).orElseThrow(() -> error(HttpStatus.CONFLICT, "Certificado no encontrado"));
        if (c.getEstado() != Certificado.Estado.PENDIENTE) throw error(HttpStatus.CONFLICT, "La emision ya no esta pendiente");
        if (!c.getHistorialId().equals(v.revisionId()) || c.getRevisionAcademica() != v.revisionAcademica()
                || !c.getEvidenciaHash().equals(v.evidenciaHash()))
            throw error(HttpStatus.CONFLICT, "La aprobacion cambio durante la emision; requiere nueva revision");
        Instant ahora = clock.instant();
        c.emitir(ahora);
        certificados.saveAndFlush(c);
        eventos.save(new CertificadoEvento(c.getId(), CertificadoEvento.Tipo.EMITIDO, emisor, null, ahora));
        return Vista.of(c);
    }

    /**
     * Transicion a FALLIDO en transaccion propia (mismo orden de bloqueo: curso primero).
     * Devuelve true SOLO si, tras el commit, la base confirma que el certificado esta FALLIDO
     * (lo marco esta llamada o ya lo estaba). Devuelve false si esta EMITIDO, si no existe o si
     * el resultado es incierto (excepcion): en esos casos el PDF NO debe eliminarse.
     */
    boolean fallar(UUID id, UUID curso, UUID actor, String motivo) {
        try {
            Boolean confirmado = tx.execute(s -> {
                jdbc.queryForObject(AprobacionService.BLOQUEAR_CURSO_JDBC, Long.class, curso);
                Certificado c = certificados.findById(id).orElse(null);
                if (c == null || c.getEstado() == Certificado.Estado.EMITIDO) return false;
                if (c.getEstado() == Certificado.Estado.PENDIENTE) {
                    Instant ahora = clock.instant();
                    c.fallar(ahora);
                    certificados.saveAndFlush(c);
                    eventos.save(new CertificadoEvento(c.getId(), CertificadoEvento.Tipo.FALLIDO, actor, motivo, ahora));
                }
                return true; // FALLIDO: su object_key (unico) no pertenece a ninguna emision valida
            });
            return Boolean.TRUE.equals(confirmado);
        } catch (RuntimeException ex) {
            log.warn("[CERTIFICADOS] No se pudo registrar el fallo de la emision {}; el PDF se conserva hasta verificarlo", id);
            return false;
        }
    }

    private void limpiar(String key) {
        try { storage.eliminar(key); }
        catch (RuntimeException ex) { log.warn("[CERTIFICADOS] Limpieza de almacenamiento pendiente; verificar inventario privado"); }
    }

    static String sha256(byte[] datos) {
        try { return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(datos)); }
        catch (java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }

    static String nuevoCodigo() {
        StringBuilder sb = new StringBuilder("DWI");
        for (int g = 0; g < 3; g++) {
            sb.append('-');
            for (int i = 0; i < 4; i++) sb.append(BASE32[RANDOM.nextInt(32)]);
        }
        return sb.toString();
    }

    // ------------------------------------------------------------------ consultas ADMIN
    /** Decisiones APROBADO cuya revision academica sigue vigente (la emision revalida el hash completo). */
    public Pagina<Aprobado> aprobadosVigentes(int page, int size) {
        validarPagina(page, size);
        String base = """
            FROM public.aprobaciones_academicas a
            JOIN public.aprobaciones_historial h ON h.aprobacion_id = a.id AND h.version = a.version
            JOIN public.cursos c ON c.id = a.curso_id
            LEFT JOIN public.curso_revision_academica r ON r.curso_id = a.curso_id
            WHERE h.decision = 'APROBADO' AND h.revision_academica = coalesce(r.revision, 0)
            """;
        Long total = jdbc.queryForObject("SELECT count(*) " + base, Long.class);
        var nombres = usuarios.nombres();
        var filas = jdbc.query("""
            SELECT a.curso_id, c.titulo, a.estudiante_id, h.fecha, h.revision_academica, k.id, k.codigo, k.estado
            """ + base.replace("WHERE", """
            LEFT JOIN public.certificados_academicos k ON k.curso_id = a.curso_id AND k.estudiante_id = a.estudiante_id
                 AND k.estado IN ('PENDIENTE','EMITIDO')
            WHERE""") + " ORDER BY h.fecha DESC, a.id LIMIT ? OFFSET ?",
            (rs, n) -> {
                UUID est = rs.getObject(3, UUID.class);
                String estado = rs.getString(8);
                return new Aprobado(rs.getObject(1, UUID.class), rs.getString(2), est, nombres.get(est),
                        rs.getTimestamp(4).toInstant(), rs.getLong(5), rs.getObject(6, UUID.class), rs.getString(7),
                        estado == null ? null : Certificado.Estado.valueOf(estado));
            }, size, (long) page * size);
        long t = total == null ? 0 : total;
        return new Pagina<>(filas, page, size, t, (int) ((t + size - 1) / size));
    }

    public Pagina<Vista> listar(int page, int size) {
        validarPagina(page, size);
        var p = certificados.findAllByOrderByCreatedAtDescIdAsc(PageRequest.of(page, size));
        return new Pagina<>(p.getContent().stream().map(Vista::of).toList(), page, size, p.getTotalElements(), p.getTotalPages());
    }

    public List<Evento> eventos(UUID id) {
        certificados.findById(id).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Certificado no encontrado"));
        return eventos.findByCertificadoIdOrderByFechaAscIdAsc(id).stream()
                .map(e -> new Evento(e.getEvento(), e.getActor(), e.getDetalle(), e.getFecha())).toList();
    }

    // ------------------------------------------------------------------ estudiante / descarga
    public List<Vista> mios(AuthPrincipal p) {
        if (!"ESTUDIANTE".equals(p.rol())) throw new AuthPrincipal.ForbiddenException("Solo disponible para estudiantes");
        return certificados.findByEstudianteIdAndEstadoOrderByFechaEmisionDescIdAsc(UUID.fromString(p.subject()), Certificado.Estado.EMITIDO)
                .stream().map(Vista::of).toList();
    }

    /** Propietario (ESTUDIANTE) o ADMIN. Un certificado ajeno responde 404 (no revela existencia). */
    public Descarga descargar(UUID id, AuthPrincipal p) {
        Certificado c = certificados.findById(id).filter(x -> x.getEstado() == Certificado.Estado.EMITIDO)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Certificado no encontrado"));
        boolean propietario = "ESTUDIANTE".equals(p.rol()) && p.isUser(c.getEstudianteId());
        if (!propietario && !p.isAdmin()) throw error(HttpStatus.NOT_FOUND, "Certificado no encontrado");
        String nombre = "certificado-" + c.getCodigo() + ".pdf";
        String url = storage.urlFirmada(c.getObjectKey(), VIGENCIA_DESCARGA, nombre);
        return new Descarga(url, clock.instant().plus(VIGENCIA_DESCARGA), nombre);
    }

    // ------------------------------------------------------------------ verificacion publica
    public Verificacion verificar(String codigo) {
        String cod = codigo == null ? "" : codigo.strip().toUpperCase(Locale.ROOT);
        if (!cod.matches("DWI-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}"))
            throw error(HttpStatus.NOT_FOUND, "Certificado no encontrado");
        Certificado c = certificados.findByCodigo(cod).filter(x -> x.getEstado() == Certificado.Estado.EMITIDO)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Certificado no encontrado"));
        return new Verificacion(c.getCodigo(), true, "VALIDO", enmascarar(c.getEstudianteNombre()), c.getCursoTitulo(),
                c.getFechaEmision(), c.getPdfSha256());
    }

    /** "Juan Carlos Perez Gomez" -> "Juan C. P. G." (verificacion publica sin exponer el nombre completo). */
    static String enmascarar(String nombre) {
        String[] partes = nombre == null ? new String[0] : nombre.strip().split("\\s+");
        if (partes.length == 0 || partes[0].isBlank()) return "";
        StringBuilder sb = new StringBuilder(partes[0]);
        for (int i = 1; i < partes.length; i++) if (!partes[i].isBlank()) sb.append(' ').append(partes[i].charAt(0)).append('.');
        return sb.toString();
    }

    private static void validarPagina(int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw error(HttpStatus.BAD_REQUEST, "Paginacion invalida");
    }
    private static ResponseStatusException error(HttpStatus s, String m) { return new ResponseStatusException(s, m); }
}
