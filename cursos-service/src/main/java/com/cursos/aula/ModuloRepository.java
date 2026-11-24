package com.cursos.aula;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface ModuloRepository extends JpaRepository<Modulo, UUID> {
    List<Modulo> findByCursoIdOrderByOrdenAscIdAsc(UUID cursoId);
    Optional<Modulo> findByIdAndCursoId(UUID id, UUID cursoId);
}
