package com.curso.pedidos.controller;

import com.curso.pedidos.dto.ActualizarEnlaceRequest;
import com.curso.pedidos.dto.CrearCursoRequest;
import com.curso.pedidos.entity.Curso;
import com.curso.pedidos.entity.EstadoCurso;
import com.curso.pedidos.service.CursoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cursos")
public class CursoController {

    private final CursoService cursoService;

    public CursoController(CursoService cursoService) {
        this.cursoService = cursoService;
    }

    // RF-04: Catálogo Público (Sin autenticación)
    @GetMapping
    public List<Curso> listarPublicos() {
        return cursoService.listarPublicos();
    }

    // RF-11: Catálogo Administrativo
    @GetMapping("/todos")
    public List<Curso> listarTodos() {
        return cursoService.listarTodos();
    }

    // RF-08: Portal Docente - Cursos asignados
    @GetMapping("/docente/{docenteId}")
    public List<Curso> listarPorDocente(@PathVariable UUID docenteId) {
        return cursoService.listarPorDocente(docenteId);
    }

    @GetMapping("/{id}")
    public Curso buscarPorId(@PathVariable UUID id) {
        return cursoService.buscarPorId(id);
    }

    // RF-11: Crear Curso
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Curso crear(@Valid @RequestBody CrearCursoRequest request) {
        return cursoService.crear(request);
    }

    // RF-10: Docente actualiza enlace Zoom/Meet
    @PutMapping("/{id}/enlace")
    public Curso actualizarEnlace(@PathVariable UUID id,
                                  @Valid @RequestBody ActualizarEnlaceRequest request) {
        return cursoService.actualizarEnlaceClase(id, request);
    }

    @PutMapping("/{id}/estado")
    public Curso cambiarEstado(@PathVariable UUID id,
                               @RequestParam EstadoCurso estado) {
        return cursoService.cambiarEstado(id, estado);
    }
}
