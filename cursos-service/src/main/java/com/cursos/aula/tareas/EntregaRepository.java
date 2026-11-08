package com.cursos.aula.tareas;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface EntregaRepository extends JpaRepository<Entrega,UUID> {
    boolean existsByTareaId(UUID tareaId);
    java.util.Optional<Entrega> findByIdAndTareaId(UUID id, UUID tareaId);
    org.springframework.data.domain.Page<Entrega> findByTareaIdAndEstadoIn(UUID tareaId,
            java.util.Collection<Entrega.Estado> estados, org.springframework.data.domain.Pageable pageable);
    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query(value = "update public.aula_entregas set version=version+1 where id=:id and version=:version and estado in ('ENTREGADA','CALIFICADA')", nativeQuery = true)
    int reservarCalificacion(@org.springframework.data.repository.query.Param("id") UUID id,
                            @org.springframework.data.repository.query.Param("version") long version);
    java.util.Optional<Entrega> findByTareaIdAndEstudianteId(UUID tareaId, UUID estudianteId);
    /** Consume the client version even when replacing only a file at the same clock instant. */
    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query(value = "update public.aula_entregas set version=version+1 where id=:id and version=:version and estado='ENTREGADA'", nativeQuery = true)
    int reservarReemplazo(@org.springframework.data.repository.query.Param("id") UUID id,
                         @org.springframework.data.repository.query.Param("version") long version);
}
