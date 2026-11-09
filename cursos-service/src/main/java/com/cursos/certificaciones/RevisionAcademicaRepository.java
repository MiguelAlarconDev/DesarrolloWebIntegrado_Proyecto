package com.cursos.certificaciones;
import org.springframework.data.repository.Repository;
import org.springframework.data.domain.*;
import java.util.*;
/** No update/delete API; PostgreSQL also rejects mutation and truncation. */
public interface RevisionAcademicaRepository extends Repository<RevisionAcademica,UUID> {
    RevisionAcademica save(RevisionAcademica revision);
    Optional<RevisionAcademica> findByAprobacionIdAndVersion(UUID aprobacionId,long version);
    Optional<RevisionAcademica> findByDocenteIdAndIdempotencia(UUID docenteId,UUID idempotencia);
    Page<RevisionAcademica> findByAprobacionIdOrderByVersionDesc(UUID aprobacionId,Pageable pageable);
}
