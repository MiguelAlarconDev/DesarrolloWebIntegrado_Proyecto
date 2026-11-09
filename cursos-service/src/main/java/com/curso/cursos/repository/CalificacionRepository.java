package com.curso.cursos.repository;

import com.curso.cursos.entity.Calificacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CalificacionRepository extends JpaRepository<Calificacion, UUID> {

    List<Calificacion> findByCursoId(UUID cursoId);

    Optional<Calificacion> findByCursoIdAndEstudianteId(UUID cursoId, UUID estudianteId);

    List<Calificacion> findByEstudianteId(UUID estudianteId);
}
