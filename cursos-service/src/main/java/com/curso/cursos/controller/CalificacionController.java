package com.curso.cursos.controller;

import com.curso.cursos.dto.GuardarCalificacionRequest;
import com.curso.cursos.entity.Calificacion;
import com.curso.cursos.service.CalificacionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cursos/calificaciones")
public class CalificacionController {

    private final CalificacionService calificacionService;

    public CalificacionController(CalificacionService calificacionService) {
        this.calificacionService = calificacionService;
    }

    @GetMapping("/curso/{cursoId}")
    public List<Calificacion> listarPorCurso(@PathVariable UUID cursoId) {
        return calificacionService.listarPorCurso(cursoId);
    }

    @GetMapping("/curso/{cursoId}/estudiante/{estudianteId}")
    public ResponseEntity<Calificacion> buscarPorCursoYEstudiante(
            @PathVariable UUID cursoId,
            @PathVariable UUID estudianteId) {
        return calificacionService.buscarPorCursoYEstudiante(cursoId, estudianteId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.OK)
    public Calificacion guardarOActualizar(@Valid @RequestBody GuardarCalificacionRequest request) {
        return calificacionService.guardarOActualizar(request);
    }
}
