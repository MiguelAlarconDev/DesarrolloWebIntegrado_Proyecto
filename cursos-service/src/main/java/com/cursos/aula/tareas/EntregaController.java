package com.cursos.aula.tareas;

import com.cursos.aula.ValidadorArchivo;
import com.cursos.security.AuthPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/cursos/{cursoId}/aula/modulos/{moduloId}/tareas/{tareaId}/mi-entrega")
public class EntregaController {
    private final EntregaService service;
    public EntregaController(EntregaService service) { this.service = service; }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<EntregaService.Vista> entregar(@PathVariable UUID cursoId, @PathVariable UUID moduloId,
            @PathVariable UUID tareaId, @RequestParam long version,
            @RequestParam(required = false) String texto,
            @RequestPart(required = false) MultipartFile archivo, HttpServletRequest req) throws IOException {
        if (archivo != null && archivo.getSize() > ValidadorArchivo.MAX_BYTES)
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "El archivo supera 10 MiB");
        EntregaService.Adjunto adjunto = archivo == null ? null :
                new EntregaService.Adjunto(archivo.getOriginalFilename(), archivo.getContentType(), archivo.getBytes());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.entregar(cursoId, moduloId,
                tareaId, version, texto, adjunto, AuthPrincipal.from(req)));
    }

    @GetMapping
    public ResponseEntity<EntregaService.Vista> propia(@PathVariable UUID cursoId, @PathVariable UUID moduloId,
            @PathVariable UUID tareaId, HttpServletRequest req) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.propia(cursoId, moduloId, tareaId, AuthPrincipal.from(req)));
    }

    @GetMapping("/archivo/descarga")
    public ResponseEntity<EntregaService.Descarga> descargar(@PathVariable UUID cursoId, @PathVariable UUID moduloId,
            @PathVariable UUID tareaId, HttpServletRequest req) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.descargar(cursoId, moduloId, tareaId, AuthPrincipal.from(req)));
    }
}
