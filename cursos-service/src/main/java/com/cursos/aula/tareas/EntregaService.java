package com.cursos.aula.tareas;

import com.cursos.aula.*;
import com.cursos.security.AuthPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.*;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.*;
import java.util.*;
import java.math.BigDecimal;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@Service
public class EntregaService {
    private static final Logger log = LoggerFactory.getLogger(EntregaService.class);
    private static final Duration VIGENCIA = Duration.ofSeconds(60);
    private final AulaService aula;
    private final TareaRepository tareas;
    private final EntregaRepository entregas;
    private final EntregaArchivoRepository archivos;
    private final AlmacenamientoArchivos storage;
    private final TransactionTemplate tx;
    private final Clock clock;

    @Autowired
    public EntregaService(AulaService aula, TareaRepository tareas, EntregaRepository entregas,
                          EntregaArchivoRepository archivos, AlmacenamientoArchivos storage,
                          PlatformTransactionManager manager) {
        this(aula, tareas, entregas, archivos, storage, manager, Clock.systemUTC());
    }

    public EntregaService(AulaService aula, TareaRepository tareas, EntregaRepository entregas,
                          EntregaArchivoRepository archivos, AlmacenamientoArchivos storage,
                          PlatformTransactionManager manager, Clock clock) {
        this.aula = aula; this.tareas = tareas; this.entregas = entregas; this.archivos = archivos;
        this.storage = storage; this.clock = clock;
        tx = new TransactionTemplate(manager);
        // Commit completes before cleanup, even if invoked from another transactional bean.
        tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        tx.setTimeout(10);
    }

    public Vista entregar(UUID curso, UUID modulo, UUID tareaId, long version, String texto,
                          Adjunto adjunto, AuthPrincipal principal) {
        UUID alumno = autorizar(curso, modulo, principal);
        if (version < -1) throw error(HttpStatus.BAD_REQUEST, "Version invalida");
        String respuesta = texto == null || texto.isBlank() ? null : texto.strip();
        if (respuesta != null && respuesta.length() > 20000) throw error(HttpStatus.BAD_REQUEST, "Texto demasiado largo");
        ValidadorArchivo.Resultado validado = adjunto == null ? null :
                ValidadorArchivo.validar(adjunto.nombre(), adjunto.mime(), adjunto.contenido());
        // Short preflight transaction; no external I/O while holding PostgreSQL locks.
        enTransaccion(() -> {
            Tarea tarea = bloquear(tareaId, modulo);
            validar(tarea, entregas.findByTareaIdAndEstudianteId(tareaId, alumno).orElse(null), version, respuesta, validado, clock.instant());
            return true;
        });

        String key = validado == null ? null : "entregas/" + tareaId + "/" + alumno + "/" + UUID.randomUUID()
                + "." + validado.tipo().name().toLowerCase(Locale.ROOT);
        if (key != null) {
            try {
                storage.subir(key, adjunto.contenido(), validado.mimeType());
            } catch (RuntimeException ex) {
                // The provider may have stored the object before a timeout.
                limpiar(key);
                throw new AlmacenamientoArchivos.NoDisponibleException("No se pudo guardar el archivo; la entrega anterior se conserva");
            }
        }

        Confirmada confirmada;
        try {
            confirmada = enTransaccion(() -> {
                tareas.bloquearCursoAcademico(curso); // orden uniforme: curso -> tarea -> entrega
                Tarea tarea = bloquear(tareaId, modulo);
                Entrega actual = entregas.findByTareaIdAndEstudianteId(tareaId, alumno).orElse(null);
                // Recheck after upload/lock acquisition: deadline, type, grade and version can change.
                Instant recibidaEn = clock.instant();
                validar(tarea, actual, version, respuesta, validado, recibidaEn);
                if (actual == null) actual = new Entrega(tareaId, alumno);
                else {
                    if (entregas.reservarReemplazo(actual.getId(), version) != 1)
                        throw error(HttpStatus.CONFLICT, "La entrega cambio");
                    actual = entregas.findByTareaIdAndEstudianteId(tareaId, alumno)
                            .orElseThrow(() -> error(HttpStatus.CONFLICT, "La entrega cambio"));
                }
                actual.entregar(respuesta, recibidaEn);
                actual = entregas.saveAndFlush(actual);
                EntregaArchivo anterior = archivos.findByEntregaId(actual.getId()).orElse(null);
                String oldKey = anterior == null ? null : anterior.getObjectKey();
                EntregaArchivo nuevo = null;
                if (key == null) {
                    if (anterior != null) archivos.delete(anterior);
                } else {
                    nuevo = anterior == null ? new EntregaArchivo(actual.getId(), key, validado, adjunto.contenido().length) : anterior;
                    if (anterior != null) nuevo.reemplazar(key, validado, adjunto.contenido().length);
                    nuevo = archivos.saveAndFlush(nuevo);
                }
                archivos.flush();
                return new Confirmada(vista(actual, nuevo), oldKey);
            });
        } catch (RuntimeException ex) {
            if (key != null) compensarSinBorrarReferencia(tareaId, modulo, key);
            throw ex;
        }
        // A cleanup failure must not turn a committed submission into an HTTP failure.
        if (confirmada.anterior() != null) limpiar(confirmada.anterior());
        return confirmada.vista();
    }

    public Vista propia(UUID curso, UUID modulo, UUID tarea, AuthPrincipal principal) {
        UUID alumno = autorizar(curso, modulo, principal);
        return enTransaccion(() -> {
            bloquear(tarea, modulo);
            Entrega entrega = propiaConfirmada(tarea, alumno);
            return vista(entrega, archivoActivo(entrega));
        });
    }

    public Descarga descargar(UUID curso, UUID modulo, UUID tarea, AuthPrincipal principal) {
        UUID alumno = autorizar(curso, modulo, principal);
        ArchivoDescarga archivo = enTransaccion(() -> {
            bloquear(tarea, modulo);
            EntregaArchivo a = archivoActivo(propiaConfirmada(tarea, alumno));
            if (a == null) throw error(HttpStatus.NOT_FOUND, "La entrega no tiene archivo");
            return new ArchivoDescarga(a.getObjectKey(), a.getNombreOriginal());
        });
        return firmar(archivo);
    }

    public Pagina listarDocente(UUID curso, UUID modulo, UUID tarea, int page, int size, AuthPrincipal principal) {
        aula.autorizarModulo(curso, modulo, principal, true);
        if (page < 0 || size < 1 || size > 100) throw error(HttpStatus.BAD_REQUEST, "Paginacion invalida: page >= 0, size entre 1 y 100");
        return enTransaccion(() -> {
            bloquear(tarea, modulo);
            var pagina = entregas.findByTareaIdAndEstadoIn(tarea,
                    List.of(Entrega.Estado.ENTREGADA, Entrega.Estado.CALIFICADA),
                    PageRequest.of(page, size, Sort.by("entregadaEn", "id")));
            return new Pagina(pagina.getContent().stream().map(e -> new Revision(e.getEstudianteId(),
                    vista(e, archivoActivo(e)))).toList(), page, size, pagina.getTotalElements(), pagina.getTotalPages());
        });
    }

    public Vista calificar(UUID curso, UUID modulo, UUID tarea, UUID entregaId,
                           BigDecimal nota, String feedback, long version, AuthPrincipal principal) {
        aula.autorizarModulo(curso, modulo, principal, true);
        if (nota == null || nota.scale() > 2 || nota.signum() < 0 || nota.compareTo(new BigDecimal("20")) > 0
                || feedback == null || feedback.isBlank() || feedback.length() > 20000 || version < 0)
            throw error(HttpStatus.BAD_REQUEST, "Nota, retroalimentacion o version invalida");
        return enTransaccion(() -> {
            tareas.bloquearCursoAcademico(curso); // orden uniforme: curso -> tarea -> entrega
            bloquear(tarea, modulo);
            Entrega e = entregaDeTarea(entregaId, tarea);
            if (e.getEstado() == Entrega.Estado.ENVIO_PENDIENTE)
                throw error(HttpStatus.CONFLICT, "La entrega no esta confirmada");
            if (e.getVersion() != version || entregas.reservarCalificacion(e.getId(), version) != 1)
                throw error(HttpStatus.CONFLICT, "La entrega cambio; recargue antes de calificar");
            e = entregaDeTarea(entregaId, tarea);
            EntregaArchivo archivo = archivoActivo(e);
            e.calificar(nota.setScale(2), feedback.strip(), UUID.fromString(principal.subject()), clock.instant());
            return vista(entregas.saveAndFlush(e), archivo);
        });
    }

    public Descarga descargarDocente(UUID curso, UUID modulo, UUID tarea, UUID entregaId, AuthPrincipal principal) {
        aula.autorizarModulo(curso, modulo, principal, true);
        ArchivoDescarga archivo = enTransaccion(() -> {
            bloquear(tarea, modulo);
            Entrega e = entregaDeTarea(entregaId, tarea);
            if (e.getEstado() == Entrega.Estado.ENVIO_PENDIENTE) throw error(HttpStatus.CONFLICT, "La entrega no esta confirmada");
            EntregaArchivo a = archivoActivo(e);
            if (a == null) throw error(HttpStatus.NOT_FOUND, "La entrega no tiene archivo");
            return new ArchivoDescarga(a.getObjectKey(), a.getNombreOriginal());
        });
        return firmar(archivo);
    }

    private Entrega entregaDeTarea(UUID id, UUID tarea) {
        return entregas.findByIdAndTareaId(id, tarea).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Entrega no encontrada"));
    }
    private Descarga firmar(ArchivoDescarga archivo) {
        String url = storage.urlFirmada(archivo.key(), VIGENCIA, archivo.nombre());
        return new Descarga(url, clock.instant().plus(VIGENCIA), archivo.nombre());
    }

    private UUID autorizar(UUID curso, UUID modulo, AuthPrincipal p) {
        if (!"ESTUDIANTE".equals(p.rol())) throw new AuthPrincipal.ForbiddenException("Solo estudiantes pueden acceder a mi entrega");
        UUID alumno;
        try { alumno = UUID.fromString(p.subject()); }
        catch (IllegalArgumentException ex) { throw new AuthPrincipal.ForbiddenException("Identidad invalida"); }
        aula.autorizarModulo(curso, modulo, p, false);
        return alumno;
    }

    private Tarea bloquear(UUID tarea, UUID modulo) {
        return tareas.bloquear(tarea, modulo).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Tarea no encontrada"));
    }

    private void validar(Tarea tarea, Entrega actual, long version, String texto, ValidadorArchivo.Resultado archivo, Instant now) {
        if (now.isAfter(tarea.getFechaLimite())) throw error(HttpStatus.CONFLICT, "El plazo de entrega ha vencido");
        if (actual == null ? version != -1 : actual.getVersion() != version)
            throw error(HttpStatus.CONFLICT, "La entrega cambio; consulte mi-entrega antes de reintentar");
        if (actual != null && actual.getEstado() != Entrega.Estado.ENTREGADA)
            throw error(HttpStatus.CONFLICT, "La entrega esta calificada o pendiente; no puede reemplazarse");
        if (tarea.getTipoEntrega() == Tarea.TipoEntrega.TEXTO && texto == null)
            throw error(HttpStatus.BAD_REQUEST, "Esta tarea requiere texto");
        if (tarea.getTipoEntrega() == Tarea.TipoEntrega.ARCHIVO && archivo == null)
            throw error(HttpStatus.BAD_REQUEST, "Esta tarea requiere archivo");
        if (texto == null && archivo == null) throw error(HttpStatus.BAD_REQUEST, "Ingrese texto o archivo");
    }

    private Entrega propiaConfirmada(UUID tarea, UUID alumno) {
        Entrega e = entregas.findByTareaIdAndEstudianteId(tarea, alumno)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "No tiene entrega para esta tarea"));
        if (e.getEstado() == Entrega.Estado.ENVIO_PENDIENTE)
            throw error(HttpStatus.CONFLICT, "La entrega no esta confirmada");
        return e;
    }

    private EntregaArchivo archivoActivo(Entrega e) {
        EntregaArchivo a = archivos.findByEntregaId(e.getId()).orElse(null);
        if (a != null && a.getEstado() != Material.Estado.ACTIVO)
            throw error(HttpStatus.CONFLICT, "El archivo no esta confirmado");
        return a;
    }

    private <T> T enTransaccion(java.util.function.Supplier<T> action) {
        try { return tx.execute(status -> action.get()); }
        catch (ResponseStatusException ex) { throw ex; }
        catch (org.springframework.dao.OptimisticLockingFailureException ex) {
            throw error(HttpStatus.CONFLICT, "La entrega cambio; consulte mi-entrega");
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            throw error(HttpStatus.CONFLICT, "Conflicto al registrar la entrega; consulte mi-entrega");
        } catch (RuntimeException ex) {
            throw error(HttpStatus.SERVICE_UNAVAILABLE, "No se pudo confirmar la operacion; consulte mi-entrega antes de reintentar");
        }
    }

    private void compensarSinBorrarReferencia(UUID tarea, UUID modulo, String key) {
        try {
            Boolean referenciada = tx.execute(status -> {
                // Wait for an ambiguous prior commit to release the same task lock.
                tareas.bloquear(tarea, modulo);
                return archivos.existsByObjectKey(key);
            });
            if (Boolean.FALSE.equals(referenciada)) limpiar(key);
        } catch (RuntimeException ex) {
            // Never delete if PostgreSQL cannot confirm that the object is unreferenced.
            log.warn("[ENTREGAS] Recuperacion de almacenamiento pendiente; verificar inventario privado");
        }
    }

    private void limpiar(String key) {
        try { storage.eliminar(key); }
        catch (RuntimeException ex) {
            log.warn("[ENTREGAS] Limpieza de almacenamiento pendiente; verificar inventario privado");
        }
    }

    private static Vista vista(Entrega e, EntregaArchivo a) {
        return new Vista(e.getId(), e.getTareaId(), e.getTexto(), e.getEstado(), e.getEntregadaEn(), e.getVersion(),
                a == null ? null : new ArchivoVista(a.getNombreOriginal(), a.getMimeType(), a.getTamanoBytes(), a.getTipo()),
                e.getNota(), e.getRetroalimentacion(), e.getCalificadaEn());
    }
    private static ResponseStatusException error(HttpStatus status, String message) { return new ResponseStatusException(status, message); }
    public record Adjunto(String nombre, String mime, byte[] contenido) {}
    public record ArchivoVista(String nombreOriginal, String mimeType, long tamanoBytes, Material.Tipo tipo) {}
    public record Vista(UUID id, UUID tareaId, String texto, Entrega.Estado estado, Instant entregadaEn, long version,
                        ArchivoVista archivo, BigDecimal nota, String retroalimentacion, Instant calificadaEn) {}
    public record Revision(UUID estudianteId, Vista entrega) {}
    public record Pagina(List<Revision> items, int page, int size, long totalElements, int totalPages) {}
    public record Descarga(String url, Instant expiraEn, String nombreArchivo) {}
    private record Confirmada(Vista vista, String anterior) {}
    private record ArchivoDescarga(String key, String nombre) {}
}
