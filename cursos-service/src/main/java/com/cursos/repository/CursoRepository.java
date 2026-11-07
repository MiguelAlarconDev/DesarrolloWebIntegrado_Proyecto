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
}
