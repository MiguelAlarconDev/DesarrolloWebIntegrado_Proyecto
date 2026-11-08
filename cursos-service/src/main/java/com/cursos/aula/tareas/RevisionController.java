package com.cursos.aula.tareas;

import com.cursos.security.AuthPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/api/cursos/{cursoId}/aula/modulos/{moduloId}/tareas/{tareaId}/entregas")
public class RevisionController {
    private final EntregaService service;
    public RevisionController(EntregaService service) { this.service = service; }
    @GetMapping
    public ResponseEntity<EntregaService.Pagina> listar(@PathVariable UUID cursoId, @PathVariable UUID moduloId,
            @PathVariable UUID tareaId, @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="20") int size, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.listarDocente(cursoId, moduloId, tareaId, page, size, AuthPrincipal.from(request)));
    }
    @PutMapping("/{entregaId}/calificacion")
    public ResponseEntity<EntregaService.Vista> calificar(@PathVariable UUID cursoId, @PathVariable UUID moduloId,
            @PathVariable UUID tareaId, @PathVariable UUID entregaId, @Valid @RequestBody Calificacion body,
            HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.calificar(cursoId, moduloId,
                tareaId, entregaId, body.nota(), body.retroalimentacion(), body.version(), AuthPrincipal.from(request)));
    }
    @GetMapping("/{entregaId}/archivo/descarga")
    public ResponseEntity<EntregaService.Descarga> descargar(@PathVariable UUID cursoId, @PathVariable UUID moduloId,
            @PathVariable UUID tareaId, @PathVariable UUID entregaId, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.descargarDocente(cursoId, moduloId, tareaId, entregaId, AuthPrincipal.from(request)));
    }
    public record Calificacion(@NotNull @DecimalMin("0") @DecimalMax("20") @Digits(integer=2,fraction=2) BigDecimal nota,
            @NotBlank @Size(max=20000) String retroalimentacion, @NotNull @Min(0) Long version) {}
}
