package com.curso.cursos.service;

import com.curso.cursos.dto.GuardarCalificacionRequest;
import com.curso.cursos.entity.Calificacion;
import com.curso.cursos.repository.CalificacionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CalificacionService {

    private final CalificacionRepository calificacionRepository;

    public CalificacionService(CalificacionRepository calificacionRepository) {
        this.calificacionRepository = calificacionRepository;
    }

    @Transactional(readOnly = true)
    public List<Calificacion> listarPorCurso(UUID cursoId) {
        return calificacionRepository.findByCursoId(cursoId);
    }

    @Transactional(readOnly = true)
    public Optional<Calificacion> buscarPorCursoYEstudiante(UUID cursoId, UUID estudianteId) {
        return calificacionRepository.findByCursoIdAndEstudianteId(cursoId, estudianteId);
    }

    @Transactional
    public Calificacion guardarOActualizar(GuardarCalificacionRequest request) {
        Calificacion calificacion = calificacionRepository
                .findByCursoIdAndEstudianteId(request.getCursoId(), request.getEstudianteId())
                .orElseGet(() -> {
                    Calificacion nueva = new Calificacion();
                    nueva.setCursoId(request.getCursoId());
                    nueva.setEstudianteId(request.getEstudianteId());
                    return nueva;
                });

        if (request.getEc1() != null) calificacion.setEc1(request.getEc1());
        if (request.getEc2() != null) calificacion.setEc2(request.getEc2());
        if (request.getProyectoFinal() != null) calificacion.setProyectoFinal(request.getProyectoFinal());
        if (request.getFeedback() != null) calificacion.setFeedback(request.getFeedback().trim());
        if (request.getDocenteId() != null) calificacion.setActualizadoPor(request.getDocenteId());

        calificacion.calcularPromedioYCondicion();
        return calificacionRepository.save(calificacion);
    }
}
