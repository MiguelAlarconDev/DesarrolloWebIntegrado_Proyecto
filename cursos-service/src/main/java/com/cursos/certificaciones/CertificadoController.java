package com.cursos.certificaciones;

import com.cursos.security.AuthPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * /api/cursos/certificados (ruta del Gateway existente hacia cursos-service).
 * Autorizacion en JwtAuthFilter: /admin/** solo ADMIN; /mios y /{id}/descarga ESTUDIANTE o ADMIN
 * (propiedad verificada en el servicio); /verificacion/** publico. Respuestas privadas no-store.
 */
@RestController
@RequestMapping("/api/cursos/certificados")
public class CertificadoController {
    private final CertificadoService service;
    public CertificadoController(CertificadoService service) { this.service = service; }

    public record Emision(@NotNull UUID cursoId, @NotNull UUID estudianteId) {}

    @PostMapping("/admin/emisiones")
    public ResponseEntity<CertificadoService.Vista> emitir(@RequestHeader("Idempotency-Key") UUID clave,
                                                           @Valid @RequestBody Emision body, HttpServletRequest req) {
        return privado(service.emitir(body.cursoId(), body.estudianteId(), clave, AuthPrincipal.from(req)));
    }

    @GetMapping("/admin/aprobados")
    public ResponseEntity<CertificadoService.Pagina<CertificadoService.Aprobado>> aprobados(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return privado(service.aprobadosVigentes(page, size));
    }

    @GetMapping("/admin")
    public ResponseEntity<CertificadoService.Pagina<CertificadoService.Vista>> listar(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return privado(service.listar(page, size));
    }

    @GetMapping("/admin/{id}/eventos")
    public ResponseEntity<List<CertificadoService.Evento>> eventos(@PathVariable UUID id) {
        return privado(service.eventos(id));
    }

    @GetMapping("/mios")
    public ResponseEntity<List<CertificadoService.Vista>> mios(HttpServletRequest req) {
        return privado(service.mios(AuthPrincipal.from(req)));
    }

    @GetMapping("/{id}/descarga")
    public ResponseEntity<CertificadoService.Descarga> descargar(@PathVariable UUID id, HttpServletRequest req) {
        return privado(service.descargar(id, AuthPrincipal.from(req)));
    }

    /** Publico: confirma autenticidad por codigo, con el nombre enmascarado y la huella SHA-256 del PDF. */
    @GetMapping("/verificacion/{codigo}")
    public ResponseEntity<CertificadoService.Verificacion> verificar(@PathVariable String codigo) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.verificar(codigo));
    }

    private static <T> ResponseEntity<T> privado(T body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);
    }
}
