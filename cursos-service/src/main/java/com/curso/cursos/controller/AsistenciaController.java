package com.curso.cursos.controller;

import com.curso.cursos.dto.RegistrarAsistenciaRequest;
import com.curso.cursos.dto.RegistrarAsistenciasLoteRequest;
import com.curso.cursos.dto.ResumenAsistenciaDto;
import com.curso.cursos.entity.Asistencia;
import com.curso.cursos.service.AsistenciaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/cursos/asistencias")
public class AsistenciaController {

    private final AsistenciaService asistenciaService;

    public AsistenciaController(AsistenciaService asistenciaService) {
        this.asistenciaService = asistenciaService;
    }

    @GetMapping("/curso/{cursoId}")
    public List<Asistencia> listarPorCurso(@PathVariable UUID cursoId) {
        return asistenciaService.listarPorCurso(cursoId);
    }

    @GetMapping("/curso/{cursoId}/sesion/{numeroSesion}")
    public List<Asistencia> listarPorCursoYSesion(
            @PathVariable UUID cursoId,
            @PathVariable Integer numeroSesion) {
        return asistenciaService.listarPorCursoYSesion(cursoId, numeroSesion);
    }

    @GetMapping("/curso/{cursoId}/resumen")
    public Map<UUID, ResumenAsistenciaDto> obtenerResumenPorCurso(@PathVariable UUID cursoId) {
        return asistenciaService.obtenerResumenPorCurso(cursoId);
    }

    @GetMapping("/curso/{cursoId}/estudiante/{estudianteId}")
    public List<Asistencia> listarPorCursoYEstudiante(
            @PathVariable UUID cursoId,
            @PathVariable UUID estudianteId) {
        return asistenciaService.listarPorCursoYEstudiante(cursoId, estudianteId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Asistencia registrarIndividual(@Valid @RequestBody RegistrarAsistenciaRequest request) {
        return asistenciaService.registrarIndividual(request);
    }

    @PostMapping("/lote")
    @ResponseStatus(HttpStatus.OK)
    public List<Asistencia> registrarLote(@Valid @RequestBody RegistrarAsistenciasLoteRequest request) {
        return asistenciaService.registrarLote(request);
    }
}
