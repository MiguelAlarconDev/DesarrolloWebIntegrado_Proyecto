package com.cursos.certificaciones;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface AprobacionRepository extends JpaRepository<Aprobacion,UUID> {
    Optional<Aprobacion> findByCursoIdAndEstudianteId(UUID cursoId,UUID estudianteId);
    @Modifying(clearAutomatically=true,flushAutomatically=true)
    @Query(value="update public.aprobaciones_academicas set version=version+1 where id=:id and version=:version",nativeQuery=true)
    int avanzar(@Param("id") UUID id,@Param("version") long version);
}
