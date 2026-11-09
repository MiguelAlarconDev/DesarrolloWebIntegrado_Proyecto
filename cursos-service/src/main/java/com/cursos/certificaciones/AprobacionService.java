package com.cursos.certificaciones;

import com.cursos.aula.*;
import com.cursos.security.AuthPrincipal;
import jakarta.persistence.EntityManager;
import org.springframework.dao.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.*;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;
import java.util.function.Supplier;

@Service
public class AprobacionService {
    /** Mismo SQL que usan los escritores del aula (CoordinacionAcademica), con parametro posicional. */
    static final String BLOQUEAR_CURSO_JDBC=com.cursos.aula.tareas.CoordinacionAcademica.BLOQUEAR_CURSO.replace(":curso","?");
    private final AulaService aula;
    private final MatriculaClient matriculas;
    private final AprobacionRepository aprobaciones;
    private final RevisionAcademicaRepository historial;
    private final EvidenciaAcademica evidencia;
    private final JdbcTemplate jdbc;
    private final EntityManager em;
    private final TransactionTemplate escritura,lectura;
    public AprobacionService(AulaService aula,MatriculaClient matriculas,AprobacionRepository aprobaciones,
            RevisionAcademicaRepository historial,EvidenciaAcademica evidencia,JdbcTemplate jdbc,
            EntityManager em,PlatformTransactionManager manager) {
        this.aula=aula;this.matriculas=matriculas;this.aprobaciones=aprobaciones;this.historial=historial;
        this.evidencia=evidencia;this.jdbc=jdbc;this.em=em;
        escritura=new TransactionTemplate(manager);
        escritura.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        escritura.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        escritura.setTimeout(10);
        lectura=new TransactionTemplate(manager);
        lectura.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        lectura.setReadOnly(true);lectura.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
        lectura.setTimeout(10);
    }
    public record Cambio(RevisionAcademica.Decision decision,String justificacion,long versionEsperada,String evidenciaHash) {}
    public record Revision(UUID id,UUID aprobacionId,long version,UUID docenteId,RevisionAcademica.Decision decision,
            String justificacion,Instant fecha,EvidenciaAcademica.Datos evidencia,String evidenciaHash,long revisionAcademica) {}
    public record Estado(Revision revision,boolean requiereRevision,boolean habilitaCertificacion) {}
    public record Pagina(List<Revision> items,int page,int size,long totalElements,int totalPages) {}
    private void autorizar(UUID curso,UUID alumno,AuthPrincipal p) {
        aula.autorizarDocente(curso,p);
        if(!matriculas.habilitada(curso,alumno)) throw new AuthPrincipal.ForbiddenException("Matricula no habilitada");
    }
    public EvidenciaAcademica.Vista evidencia(UUID curso,UUID alumno,AuthPrincipal p) {
        autorizar(curso,alumno,p);
        return leer(()->{aula.autorizarDocente(curso,p);return evidencia.leer(curso,alumno);});
    }
    public Estado actual(UUID curso,UUID alumno,AuthPrincipal p) {
        autorizar(curso,alumno,p);
        return leer(()->{
            aula.autorizarDocente(curso,p);
            Aprobacion a=aprobaciones.findByCursoIdAndEstudianteId(curso,alumno).orElseThrow(()->error(HttpStatus.NOT_FOUND,"Sin decision academica"));
            RevisionAcademica r=historial.findByAprobacionIdAndVersion(a.getId(),a.getVersion()).orElseThrow();
            var vigente=evidencia.leer(curso,alumno);
            // Revision monotona: una decision tomada sobre otra revision nunca recupera vigencia,
            // aunque los datos vuelvan a coincidir (cambios revertidos).
            boolean desactualizada=r.getRevisionAcademica()!=vigente.revisionAcademica()
                    ||!r.getEvidenciaHash().equals(vigente.evidenciaHash());
            return new Estado(vista(r),desactualizada,!desactualizada && r.getDecision()==RevisionAcademica.Decision.APROBADO);
        });
    }
    public Pagina historial(UUID curso,UUID alumno,int page,int size,AuthPrincipal p) {
        if(page<0||size<1||size>100) throw error(HttpStatus.BAD_REQUEST,"Paginacion invalida");
        autorizar(curso,alumno,p);
        return leer(()->{
            aula.autorizarDocente(curso,p);
            var a=aprobaciones.findByCursoIdAndEstudianteId(curso,alumno);
            if(a.isEmpty()) return new Pagina(List.of(),page,size,0,0);
            var lista=historial.findByAprobacionIdOrderByVersionDesc(a.get().getId(),PageRequest.of(page,size));
            return new Pagina(lista.getContent().stream().map(this::vista).toList(),page,size,lista.getTotalElements(),lista.getTotalPages());
        });
    }
    public Revision confirmar(UUID curso,UUID alumno,Cambio cambio,UUID clave,AuthPrincipal p) {
        if(cambio==null||cambio.decision()==null||clave==null||cambio.justificacion()==null
                ||cambio.justificacion().isBlank()||cambio.justificacion().length()>20000||cambio.versionEsperada() < -1
                ||cambio.evidenciaHash()==null||!cambio.evidenciaHash().matches("[0-9a-f]{64}"))
            throw error(HttpStatus.BAD_REQUEST,"Decision, justificacion, version o evidencia invalidas");
        autorizar(curso,alumno,p); // No remote calls while holding database locks.
        UUID docente=UUID.fromString(p.subject());
        Cambio normalizado=new Cambio(cambio.decision(),cambio.justificacion().strip(),cambio.versionEsperada(),cambio.evidenciaHash());
        String solicitud=EvidenciaAcademica.hash(evidencia.serializar(List.of(curso,alumno,normalizado)));
        try {
            return escritura.execute(status->{
                jdbc.execute("SET LOCAL lock_timeout = '3s'");
                // 1) Coordinacion por curso (mismo primer bloqueo que todo escritor academico). Serializa
                //    decisiones del curso y espera/impide cambios de tareas y entregas SOLO de este curso.
                long revision=bloquearCurso(curso);
                // 2) Reintentos con la misma clave del mismo actor aunque apunten a otro curso/alumno.
                jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended(?,0))",(rs,n)->0,"academico:"+docente+":"+clave);
                // 3) Impide cambiar el docente asignado durante la decision.
                jdbc.query("SELECT id FROM public.cursos WHERE id=? FOR SHARE",(rs,n)->rs.getObject(1),curso);
                em.clear(); // Do not reuse a pre-transaction owner/entity snapshot (including OSIV).
                aula.autorizarDocente(curso,p);
                var anterior=historial.findByDocenteIdAndIdempotencia(docente,clave);
                if(anterior.isPresent()) {
                    if(!anterior.get().getSolicitudHash().equals(solicitud)) throw conflicto("Clave de idempotencia reutilizada con otro contenido");
                    return vista(anterior.get()); // Original immutable revision, never a cached eligibility flag.
                }
                var datos=evidencia.leer(curso,alumno);
                if(datos.revisionAcademica()!=revision) throw conflicto("La evidencia cambio; consulte nuevamente");
                if(!datos.evidenciaHash().equals(cambio.evidenciaHash())) throw conflicto("La evidencia cambio; consulte nuevamente");
                var existente=aprobaciones.findByCursoIdAndEstudianteId(curso,alumno);
                Aprobacion a;long version;
                if(existente.isEmpty()) {
                    if(cambio.versionEsperada()!=-1||cambio.decision()==RevisionAcademica.Decision.REVOCADO)
                        throw conflicto("No existe una decision para esta version");
                    a=aprobaciones.saveAndFlush(new Aprobacion(curso,alumno));version=0;
                } else {
                    a=existente.get();
                    if(cambio.versionEsperada()!=a.getVersion()||aprobaciones.avanzar(a.getId(),cambio.versionEsperada())!=1)
                        throw conflicto("La decision cambio; recargue antes de continuar");
                    version=cambio.versionEsperada()+1;
                }
                var r=new RevisionAcademica(a.getId(),version,docente,cambio.decision(),normalizado.justificacion(),
                    evidencia.serializar(datos.evidencia()),datos.revisionAcademica(),datos.canonica(),datos.evidenciaHash(),clave,solicitud);
                historial.save(r);em.flush();return vista(r);
            });
        } catch(DataIntegrityViolationException|ConcurrencyFailureException|TransactionTimedOutException ex) {
            throw conflicto("Conflicto concurrente; recargue o reintente con la misma clave");
        } catch(DataAccessResourceFailureException ex) {throw error(HttpStatus.SERVICE_UNAVAILABLE,"Persistencia academica no disponible");}
    }
    /** Primer bloqueo del curso; devuelve la revision academica vigente. */
    long bloquearCurso(UUID curso) {
        Long r=jdbc.queryForObject(BLOQUEAR_CURSO_JDBC,Long.class,curso);
        return r==null?0:r;
    }
    private <T> T leer(Supplier<T> work){return lectura.execute(s->{em.clear();return work.get();});}
    private Revision vista(RevisionAcademica r) {
        return new Revision(r.getId(),r.getAprobacionId(),r.getVersion(),r.getDocenteId(),r.getDecision(),
            r.getJustificacion(),r.getFecha(),evidencia.leerGuardada(r.getEvidencia()),r.getEvidenciaHash(),r.getRevisionAcademica());
    }
    private static ResponseStatusException conflicto(String mensaje){return error(HttpStatus.CONFLICT,mensaje);}
    private static ResponseStatusException error(HttpStatus status,String mensaje){return new ResponseStatusException(status,mensaje);}
}
