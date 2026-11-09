package com.cursos.certificaciones;

import com.cursos.security.AuthPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/cursos/{cursoId}/aula/recomendaciones")
public class RecomendacionController {
    private final RecomendacionService service;
    public RecomendacionController(RecomendacionService service) { this.service = service; }
    @GetMapping("/{estudianteId}")
    public ResponseEntity<MotorRecomendacion.Resultado> consultar(@PathVariable UUID cursoId,
            @PathVariable UUID estudianteId, HttpServletRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.consultar(cursoId, estudianteId, AuthPrincipal.from(request)));
    }
}
