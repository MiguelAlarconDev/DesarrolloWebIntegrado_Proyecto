package com.cursos.aula.tareas;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface TareaRepository extends JpaRepository<Tarea,UUID> {
    /** Coordinacion por curso: SIEMPRE la primera sentencia que bloquea en un escritor academico. */
    @org.springframework.transaction.annotation.Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    @Query(value = CoordinacionAcademica.BLOQUEAR_CURSO, nativeQuery = true)
    Long bloquearCursoAcademico(@Param("curso") UUID curso);
    @Query(value = CoordinacionAcademica.REVISION_ACTUAL, nativeQuery = true)
    Long revisionAcademica(@Param("curso") UUID curso);
    @Query(value = """
        select t.id as tareaId, t.modulo_id as moduloId, t.version as tareaVersion,
               e.id as entregaId, e.version as entregaVersion, e.estado as estado, e.nota as nota,
               (e.entregada_en is not null) as confirmada
        from public.aula_tareas t join public.curso_modulos m on m.id=t.modulo_id
        left join public.aula_entregas e on e.tarea_id=t.id and e.estudiante_id=:estudiante
        where m.curso_id=:curso order by t.id
        """,nativeQuery=true)
    List<EvaluacionVersionada> evidencia(@Param("curso") UUID curso,@Param("estudiante") UUID estudiante);
    interface EvaluacionVersionada extends EvaluacionAcademica {
        UUID getModuloId();
        long getTareaVersion();
        UUID getEntregaId();
        Long getEntregaVersion();
    }
    /** Single statement: tasks and grades belong to the same PostgreSQL statement snapshot. */
    @Query(value = """
        select t.id as tareaId, e.estado as estado, e.nota as nota, (e.entregada_en is not null) as confirmada
        from public.aula_tareas t
        join public.curso_modulos m on m.id = t.modulo_id
        left join public.aula_entregas e on e.tarea_id = t.id and e.estudiante_id = :estudiante
        where m.curso_id = :curso
        order by t.id
        """, nativeQuery = true)
    List<EvaluacionAcademica> evaluaciones(@Param("curso") UUID cursoId, @Param("estudiante") UUID estudianteId);

    interface EvaluacionAcademica {
        UUID getTareaId();
        Entrega.Estado getEstado();
        java.math.BigDecimal getNota();
        boolean getConfirmada();
    }
    List<Tarea> findByModuloIdOrderByCreatedAtAscIdAsc(UUID moduloId);
    Optional<Tarea> findByIdAndModuloId(UUID id, UUID moduloId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Tarea t where t.id=:id and t.moduloId=:modulo")
    Optional<Tarea> bloquear(@Param("id") UUID id, @Param("modulo") UUID moduloId);
}
