package com.curso.cursos.repository;

import com.curso.cursos.entity.Asistencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AsistenciaRepository extends JpaRepository<Asistencia, UUID> {

    List<Asistencia> findByCursoIdOrderByNumeroSesionAsc(UUID cursoId);

    List<Asistencia> findByCursoIdAndNumeroSesion(UUID cursoId, Integer numeroSesion);

    List<Asistencia> findByCursoIdAndFechaSesion(UUID cursoId, String fechaSesion);

    Optional<Asistencia> findByCursoIdAndEstudianteIdAndNumeroSesion(UUID cursoId, UUID estudianteId, Integer numeroSesion);

    List<Asistencia> findByCursoIdAndEstudianteIdOrderByNumeroSesionAsc(UUID cursoId, UUID estudianteId);
}
