package com.curso.pedidos.repository;

import com.curso.pedidos.entity.Curso;
import com.curso.pedidos.entity.EstadoCurso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CursoRepository extends JpaRepository<Curso, UUID> {
    List<Curso> findByEstado(EstadoCurso estado);
    List<Curso> findByDocenteId(UUID docenteId);
}
