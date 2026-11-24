package com.cursos.repository;

import com.cursos.entity.Curso;
import com.cursos.entity.EstadoCurso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CursoRepository extends JpaRepository<Curso, UUID> {

    List<Curso> findByEstadoOrderByIdAsc(EstadoCurso estado);

    List<Curso> findAllByOrderByIdAsc();

    List<Curso> findByDocenteIdOrderByIdAsc(UUID docenteId);

    /** Bloqueo de fila: dos compras simultaneas no pueden tomar la misma ultima vacante. */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select c from Curso c where c.id = :id")
    java.util.Optional<Curso> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") UUID id);
}
