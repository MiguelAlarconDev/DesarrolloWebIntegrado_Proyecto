package com.cursos.aula.tareas;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface TareaRepository extends JpaRepository<Tarea,UUID> {
    List<Tarea> findByModuloIdOrderByCreatedAtAscIdAsc(UUID moduloId);
    Optional<Tarea> findByIdAndModuloId(UUID id, UUID moduloId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Tarea t where t.id=:id and t.moduloId=:modulo")
    Optional<Tarea> bloquear(@Param("id") UUID id, @Param("modulo") UUID moduloId);
}
