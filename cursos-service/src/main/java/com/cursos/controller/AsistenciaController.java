package com.cursos.controller;

import com.cursos.dto.RegistrarAsistenciaRequest;
import com.cursos.dto.RegistrarAsistenciasLoteRequest;
import com.cursos.dto.ResumenAsistenciaDto;
import com.cursos.entity.Asistencia;
import com.cursos.service.AsistenciaService;
import com.cursos.security.AuthPrincipal;
import com.cursos.service.CursoService;
import jakarta.servlet.http.HttpServletRequest;
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
    private final CursoService cursoService;

    public AsistenciaController(AsistenciaService asistenciaService, CursoService cursoService) {
        this.asistenciaService = asistenciaService;
        this.cursoService = cursoService;
    }

    /** Solo el docente del curso o un ADMIN. */
    private void exigirDocenteDelCurso(UUID cursoId, HttpServletRequest http) {
        AuthPrincipal p = AuthPrincipal.from(http);
        if (!p.isStaff()) {
            throw new AuthPrincipal.ForbiddenException("Solo el docente del curso puede gestionar esta informacion");
        }
        cursoService.verificarPropietario(cursoId, p);
    }

    /** El propio alumno, el docente del curso o un ADMIN. */
    private void exigirAlumnoODocente(UUID cursoId, UUID estudianteId, HttpServletRequest http) {
        AuthPrincipal p = AuthPrincipal.from(http);
        if (p.isUser(estudianteId) || p.isService()) {
            return; // el alumno ve lo suyo; pedidos-service consulta la nota para emitir certificados
        }
        exigirDocenteDelCurso(cursoId, http);
    }

    @GetMapping("/curso/{cursoId}")
    public List<Asistencia> listarPorCurso(@PathVariable UUID cursoId, HttpServletRequest http) {
        exigirDocenteDelCurso(cursoId, http);
        return asistenciaService.listarPorCurso(cursoId);
    }

    @GetMapping("/curso/{cursoId}/sesion/{numeroSesion}")
    public List<Asistencia> listarPorCursoYSesion(
            @PathVariable UUID cursoId,
            @PathVariable Integer numeroSesion, HttpServletRequest http) {
        exigirDocenteDelCurso(cursoId, http);
        return asistenciaService.listarPorCursoYSesion(cursoId, numeroSesion);
    }

    @GetMapping("/curso/{cursoId}/resumen")
    public Map<UUID, ResumenAsistenciaDto> obtenerResumenPorCurso(@PathVariable UUID cursoId, HttpServletRequest http) {
        exigirDocenteDelCurso(cursoId, http);
        return asistenciaService.obtenerResumenPorCurso(cursoId);
    }

    @GetMapping("/curso/{cursoId}/estudiante/{estudianteId}")
    public List<Asistencia> listarPorCursoYEstudiante(
            @PathVariable UUID cursoId,
            @PathVariable UUID estudianteId, HttpServletRequest http) {
        exigirAlumnoODocente(cursoId, estudianteId, http);
        return asistenciaService.listarPorCursoYEstudiante(cursoId, estudianteId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Asistencia registrarIndividual(@Valid @RequestBody RegistrarAsistenciaRequest request, HttpServletRequest http) {
        exigirDocenteDelCurso(request.getCursoId(), http);
        // quien registra es el usuario del token, nunca un id enviado por el cliente
        request.setDocenteId(java.util.UUID.fromString(AuthPrincipal.from(http).subject()));
        return asistenciaService.registrarIndividual(request);
    }

    @PostMapping("/lote")
    @ResponseStatus(HttpStatus.OK)
    public List<Asistencia> registrarLote(@Valid @RequestBody RegistrarAsistenciasLoteRequest request, HttpServletRequest http) {
        exigirDocenteDelCurso(request.getCursoId(), http);
        // quien registra es el usuario del token, nunca un id enviado por el cliente
        request.setDocenteId(java.util.UUID.fromString(AuthPrincipal.from(http).subject()));
        return asistenciaService.registrarLote(request);
    }
}
