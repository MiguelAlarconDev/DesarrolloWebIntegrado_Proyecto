package com.cursos.aula;

import com.cursos.security.AuthPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cursos/{cursoId}/aula")
public class AulaController {
    private final AulaService aula;
    public AulaController(AulaService aula) { this.aula = aula; }

    @GetMapping
    public ResponseEntity<List<AulaService.ModuloVista>> listar(@PathVariable UUID cursoId, HttpServletRequest req) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(aula.listar(cursoId, AuthPrincipal.from(req)));
    }
    @PostMapping("/modulos")
    public ResponseEntity<AulaService.ModuloVista> crear(@PathVariable UUID cursoId, @Valid @RequestBody ModuloRequest body,
                                                        HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore())
                .body(aula.crear(cursoId, body.titulo(), body.orden(), AuthPrincipal.from(req)));
    }
    @PatchMapping("/modulos/{moduloId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void editar(@PathVariable UUID cursoId, @PathVariable UUID moduloId, @Valid @RequestBody ModuloRequest body,
                       HttpServletRequest req) {
        aula.editar(cursoId, moduloId, body.titulo(), body.orden(), AuthPrincipal.from(req));
    }

    /** Subida multipart: campo "archivo" (obligatorio) y "titulo" (opcional). */
    @PostMapping(path = "/modulos/{moduloId}/materiales", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AulaService.MaterialVista> subir(@PathVariable UUID cursoId, @PathVariable UUID moduloId,
                                                          @RequestPart("archivo") MultipartFile archivo,
                                                          @RequestParam(value = "titulo", required = false) String titulo,
                                                          HttpServletRequest req) throws IOException {
        AuthPrincipal principal = AuthPrincipal.from(req);
        if (archivo.getSize() > ValidadorArchivo.MAX_BYTES) {
            throw new ValidadorArchivo.ArchivoInvalidoException("El archivo supera el maximo de 10 MiB");
        }
        AulaService.MaterialVista creado = aula.subir(cursoId, moduloId, titulo, archivo.getOriginalFilename(),
                archivo.getContentType(), archivo.getBytes(), principal);
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore()).body(creado);
    }

    @DeleteMapping("/modulos/{moduloId}/materiales/{materialId}")
    public ResponseEntity<Void> eliminar(@PathVariable UUID cursoId, @PathVariable UUID moduloId,
                                         @PathVariable UUID materialId, HttpServletRequest req) {
        aula.eliminar(cursoId, moduloId, materialId, AuthPrincipal.from(req));
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }

    /** Devuelve una URL firmada de 60 s (JSON); el navegador la abre directamente. */
    @GetMapping("/modulos/{moduloId}/materiales/{materialId}/descarga")
    public ResponseEntity<AulaService.Descarga> descargar(@PathVariable UUID cursoId, @PathVariable UUID moduloId,
                                                          @PathVariable UUID materialId, HttpServletRequest req) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("Pragma", "no-cache")
                .body(aula.descargar(cursoId, moduloId, materialId, AuthPrincipal.from(req)));
    }

    public record ModuloRequest(@NotBlank @Size(max = 150) String titulo, @NotNull @Min(1) Integer orden) {}
}
