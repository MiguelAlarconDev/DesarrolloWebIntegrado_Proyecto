package com.curso.cursos.repository;

import com.curso.cursos.entity.Curso;
import com.curso.cursos.entity.EstadoCurso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CursoRepository extends JpaRepository<Curso, UUID> {

    List<Curso> findByEstado(EstadoCurso estado);

    List<Curso> findByDocenteId(UUID docenteId);
}
