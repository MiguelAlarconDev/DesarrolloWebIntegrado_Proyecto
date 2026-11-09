package com.cursos.certificaciones;

import com.cursos.aula.MatriculaClient;
import com.cursos.security.AuthPrincipal;
import jakarta.persistence.EntityManager;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionTimedOutException;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;
import java.util.function.Function;

/**
 * Punto unico para la FUTURA emision de certificados (aun no existe endpoint de emision).
 *
 * Nunca confia en flags cacheados ni en la respuesta de una decision previa:
 *  1. Revalida matricula PAGADO en Pedidos inmediatamente antes (sin bloqueos de BD abiertos).
 *  2. En UNA transaccion: bloquea la revision del curso (mismo primer bloqueo que todo escritor
 *     academico), bloquea el curso FOR SHARE, relee decision vigente, exige APROBADO, revision
 *     academica identica y hash recalculado identico; y ejecuta la emision dentro de esa misma
 *     transaccion, de modo que ningun cambio academico del curso puede intercalarse.
 *
 * Limite: Pedidos es otro servicio; la matricula no puede formar parte de esta transaccion.
 * Un reembolso que ocurra entre el paso 1 y el commit no se detecta aqui (no se modifica Pedidos).
 */
@Component
public class ValidadorEmision {
    private final MatriculaClient matriculas;
    private final AprobacionRepository aprobaciones;
    private final RevisionAcademicaRepository historial;
    private final EvidenciaAcademica evidencia;
    private final JdbcTemplate jdbc;
    private final EntityManager em;
    private final TransactionTemplate tx;

    public ValidadorEmision(MatriculaClient matriculas, AprobacionRepository aprobaciones,
                            RevisionAcademicaRepository historial, EvidenciaAcademica evidencia,
                            JdbcTemplate jdbc, EntityManager em, PlatformTransactionManager manager) {
        this.matriculas = matriculas; this.aprobaciones = aprobaciones; this.historial = historial;
        this.evidencia = evidencia; this.jdbc = jdbc; this.em = em;
        tx = new TransactionTemplate(manager);
        tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        tx.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        tx.setTimeout(10);
    }

    /** Datos verificados que la emision debe registrar junto al certificado. */
    public record AprobacionVigente(UUID cursoId, UUID estudianteId, UUID aprobacionId, long version,
                                    UUID revisionId, long revisionAcademica, String evidenciaHash) {}

    public <T> T conAprobacionVigente(UUID curso, UUID alumno, Function<AprobacionVigente, T> emitir) {
        if (!matriculas.habilitada(curso, alumno)) {
            throw new AuthPrincipal.ForbiddenException("Matricula no habilitada");
        }
        try {
            return tx.execute(status -> {
                jdbc.execute("SET LOCAL lock_timeout = '3s'");
                Long rev = jdbc.queryForObject(AprobacionService.BLOQUEAR_CURSO_JDBC, Long.class, curso);
                long revision = rev == null ? 0 : rev;
                jdbc.query("SELECT id FROM public.cursos WHERE id=? FOR SHARE", (rs, n) -> rs.getObject(1), curso);
                em.clear();
                Aprobacion a = aprobaciones.findByCursoIdAndEstudianteId(curso, alumno)
                        .orElseThrow(() -> noVigente("Sin decision academica"));
                RevisionAcademica r = historial.findByAprobacionIdAndVersion(a.getId(), a.getVersion())
                        .orElseThrow(() -> noVigente("Decision academica inconsistente"));
                if (r.getDecision() != RevisionAcademica.Decision.APROBADO) throw noVigente("La decision vigente no es APROBADO");
                var actual = evidencia.leer(curso, alumno);
                if (r.getRevisionAcademica() != revision || actual.revisionAcademica() != revision
                        || !r.getEvidenciaHash().equals(actual.evidenciaHash())
                        || !r.getEvidenciaHash().equals(EvidenciaAcademica.hash(r.getEvidenciaCanonica()))) {
                    throw noVigente("La evidencia academica cambio desde la aprobacion; requiere nueva revision docente");
                }
                return emitir.apply(new AprobacionVigente(curso, alumno, a.getId(), a.getVersion(), r.getId(),
                        revision, r.getEvidenciaHash()));
            });
        } catch (ConcurrencyFailureException | TransactionTimedOutException ex) {
            throw noVigente("Conflicto concurrente; reintente la emision");
        } catch (DataAccessResourceFailureException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Persistencia academica no disponible");
        }
    }

    private static ResponseStatusException noVigente(String msg) {
        return new ResponseStatusException(HttpStatus.CONFLICT, msg);
    }
}
