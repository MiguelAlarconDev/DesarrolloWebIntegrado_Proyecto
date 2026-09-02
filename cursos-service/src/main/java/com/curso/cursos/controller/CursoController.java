package com.curso.cursos.controller;

import com.curso.cursos.dto.ActualizarDatosClaseRequest;
import com.curso.cursos.dto.ActualizarEnlaceRequest;
import com.curso.cursos.dto.CrearCursoRequest;
import com.curso.cursos.entity.Curso;
import com.curso.cursos.entity.EstadoCurso;
import com.curso.cursos.service.CursoService;
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

    @GetMapping
    public List<Curso> listarPublicos() {
        return cursoService.listarPublicos();
    }

    @GetMapping("/todos")
    public List<Curso> listarTodos() {
        return cursoService.listarTodos();
    }

    @GetMapping("/docente/{docenteId}")
    public List<Curso> listarPorDocente(@PathVariable UUID docenteId) {
        return cursoService.listarPorDocente(docenteId);
    }

    @GetMapping("/{id}")
    public Curso buscarPorId(@PathVariable UUID id) {
        return cursoService.buscarPorId(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Curso crear(@Valid @RequestBody CrearCursoRequest request) {
        return cursoService.crear(request);
    }

    @PutMapping("/{id}/enlace")
    public Curso actualizarEnlace(@PathVariable UUID id,
                                  @Valid @RequestBody ActualizarEnlaceRequest request) {
        return cursoService.actualizarEnlaceClase(id, request);
    }

    @PutMapping("/{id}/datos-clase")
    public Curso actualizarDatosClase(@PathVariable UUID id,
                                      @Valid @RequestBody ActualizarDatosClaseRequest request) {
        return cursoService.actualizarDatosClase(id, request);
    }

    @PutMapping("/{id}/estado")
    public Curso cambiarEstado(@PathVariable UUID id,
                               @RequestParam EstadoCurso estado) {
        return cursoService.cambiarEstado(id, estado);
    }

    @PutMapping("/{id}/descontar-aforo")
    public Curso descontarAforo(@PathVariable UUID id) {
        return cursoService.descontarAforo(id);
    }

    @PutMapping("/{id}/liberar-aforo")
    public Curso liberarAforo(@PathVariable UUID id) {
        return cursoService.liberarAforo(id);
    }
}
