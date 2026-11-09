package com.cursos.certificaciones;
import com.cursos.security.AuthPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/cursos/{cursoId}/aula/aprobaciones/{estudianteId}")
public class AprobacionController {
    private final AprobacionService service;
    public AprobacionController(AprobacionService service){this.service=service;}
    public record Confirmacion(@NotNull RevisionAcademica.Decision decision,@NotBlank @Size(max=20000) String justificacion,
        @NotNull @Min(-1) Long versionEsperada,@NotNull @Pattern(regexp="[0-9a-f]{64}") String evidenciaHash) {}
    public record Revocacion(@NotBlank @Size(max=20000) String justificacion,@NotNull @Min(0) Long versionEsperada,
        @NotNull @Pattern(regexp="[0-9a-f]{64}") String evidenciaHash) {}
    @GetMapping("/evidencia")
    public ResponseEntity<EvidenciaAcademica.Vista> evidencia(@PathVariable UUID cursoId,@PathVariable UUID estudianteId,HttpServletRequest req) {
        return privado(service.evidencia(cursoId,estudianteId,AuthPrincipal.from(req)));
    }
    @GetMapping
    public ResponseEntity<AprobacionService.Estado> actual(@PathVariable UUID cursoId,@PathVariable UUID estudianteId,HttpServletRequest req) {
        return privado(service.actual(cursoId,estudianteId,AuthPrincipal.from(req)));
    }
    @GetMapping("/historial")
    public ResponseEntity<AprobacionService.Pagina> historial(@PathVariable UUID cursoId,@PathVariable UUID estudianteId,
            @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,HttpServletRequest req) {
        return privado(service.historial(cursoId,estudianteId,page,size,AuthPrincipal.from(req)));
    }
    @PostMapping
    public ResponseEntity<AprobacionService.Revision> confirmar(@PathVariable UUID cursoId,@PathVariable UUID estudianteId,
            @RequestHeader("Idempotency-Key") UUID clave,@Valid @RequestBody Confirmacion body,HttpServletRequest req) {
        if(body.decision()==RevisionAcademica.Decision.REVOCADO) throw new org.springframework.web.server.ResponseStatusException(
            HttpStatus.BAD_REQUEST,"Use el endpoint de revocaciones");
        return privado(service.confirmar(cursoId,estudianteId,new AprobacionService.Cambio(body.decision(),body.justificacion(),
            body.versionEsperada(),body.evidenciaHash()),clave,AuthPrincipal.from(req)));
    }
    @PostMapping("/revocaciones")
    public ResponseEntity<AprobacionService.Revision> revocar(@PathVariable UUID cursoId,@PathVariable UUID estudianteId,
            @RequestHeader("Idempotency-Key") UUID clave,@Valid @RequestBody Revocacion body,HttpServletRequest req) {
        return privado(service.confirmar(cursoId,estudianteId,new AprobacionService.Cambio(RevisionAcademica.Decision.REVOCADO,
            body.justificacion(),body.versionEsperada(),body.evidenciaHash()),clave,AuthPrincipal.from(req)));
    }
    private static <T> ResponseEntity<T> privado(T body){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);}
}
