package com.cursos.aula.tareas;
import com.cursos.security.AuthPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/cursos/{cursoId}/aula/modulos/{moduloId}/tareas")
public class TareaController {
    private final TareaService tareas;
    public TareaController(TareaService tareas){this.tareas=tareas;}
    @GetMapping
    public ResponseEntity<List<TareaService.Vista>> listar(@PathVariable UUID cursoId,@PathVariable UUID moduloId,HttpServletRequest req){
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(tareas.listar(cursoId,moduloId,AuthPrincipal.from(req)));
    }
    @GetMapping("/{id}")
    public ResponseEntity<TareaService.Vista> detalle(@PathVariable UUID cursoId,@PathVariable UUID moduloId,@PathVariable UUID id,HttpServletRequest req){
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(tareas.detalle(cursoId,moduloId,id,AuthPrincipal.from(req)));
    }
    @PostMapping
    public ResponseEntity<TareaService.Vista> crear(@PathVariable UUID cursoId,@PathVariable UUID moduloId,@Valid @RequestBody Crear body,HttpServletRequest req){
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore()).body(tareas.crear(cursoId,moduloId,body,AuthPrincipal.from(req)));
    }
    @PatchMapping("/{id}")
    public ResponseEntity<TareaService.Vista> editar(@PathVariable UUID cursoId,@PathVariable UUID moduloId,@PathVariable UUID id,@Valid @RequestBody Editar body,HttpServletRequest req){
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(tareas.editar(cursoId,moduloId,id,body,AuthPrincipal.from(req)));
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable UUID cursoId,@PathVariable UUID moduloId,@PathVariable UUID id,@RequestParam long version,HttpServletRequest req){
        tareas.eliminar(cursoId,moduloId,id,version,AuthPrincipal.from(req));
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }
    @ExceptionHandler({org.springframework.dao.OptimisticLockingFailureException.class,
            org.springframework.dao.DataIntegrityViolationException.class})
    public ResponseEntity<Map<String,String>> conflictoPersistencia(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).cacheControl(CacheControl.noStore())
                .body(Map.of("message","La tarea cambio o tiene referencias; recargue antes de continuar"));
    }
    public record Crear(@NotBlank @Size(max=200) String titulo,@NotBlank @Size(max=20000) String consigna,
                        @NotNull Instant fechaLimite,@NotNull Tarea.TipoEntrega tipoEntrega){}
    /** PATCH replaces editable fields together; version is mandatory to prevent lost updates. */
    public record Editar(@NotBlank @Size(max=200) String titulo,@NotBlank @Size(max=20000) String consigna,
                         @NotNull Instant fechaLimite,@NotNull Tarea.TipoEntrega tipoEntrega,@NotNull @Min(0) Long version){}
}
