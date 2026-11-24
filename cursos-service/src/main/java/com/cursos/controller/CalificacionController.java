package com.cursos.controller;

import com.cursos.dto.GuardarCalificacionRequest;
import com.cursos.entity.Calificacion;
import com.cursos.service.CalificacionService;
import com.cursos.security.AuthPrincipal;
import com.cursos.service.CursoService;
import jakarta.servlet.http.HttpServletRequest;
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
    private final CursoService cursoService;

    public CalificacionController(CalificacionService calificacionService, CursoService cursoService) {
        this.calificacionService = calificacionService;
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
    public List<Calificacion> listarPorCurso(@PathVariable UUID cursoId, HttpServletRequest http) {
        exigirDocenteDelCurso(cursoId, http);
        return calificacionService.listarPorCurso(cursoId);
    }

    @GetMapping("/curso/{cursoId}/estudiante/{estudianteId}")
    public ResponseEntity<Calificacion> buscarPorCursoYEstudiante(
            @PathVariable UUID cursoId,
            @PathVariable UUID estudianteId, HttpServletRequest http) {
        exigirAlumnoODocente(cursoId, estudianteId, http);
        return calificacionService.buscarPorCursoYEstudiante(cursoId, estudianteId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.OK)
    public Calificacion guardarOActualizar(@Valid @RequestBody GuardarCalificacionRequest request, HttpServletRequest http) {
        exigirDocenteDelCurso(request.getCursoId(), http);
        // quien registra es el usuario del token, nunca un id enviado por el cliente
        request.setDocenteId(java.util.UUID.fromString(AuthPrincipal.from(http).subject()));
        return calificacionService.guardarOActualizar(request);
    }
}
