package com.cursos.aula;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface MaterialRepository extends JpaRepository<Material, UUID> {
    List<Material> findByModuloIdInAndEstadoOrderByCreatedAtAscIdAsc(Collection<UUID> moduloIds, Material.Estado estado);

    /** Pertenencia material -> modulo; la del modulo -> curso se valida aparte. */
    Optional<Material> findByIdAndModuloId(UUID id, UUID moduloId);
}
