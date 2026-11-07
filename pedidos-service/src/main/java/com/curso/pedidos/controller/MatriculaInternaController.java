package com.curso.pedidos.controller;

import com.curso.pedidos.entity.EstadoPedido;
import com.curso.pedidos.repository.PedidoRepository;
import com.curso.pedidos.security.AuthPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Minimal entitlement query: no payment mutations, PII or HTTP enrichment. */
@RestController
@RequestMapping("/api/pedidos/interno/matriculas")
public class MatriculaInternaController {
    private final PedidoRepository pedidos;

    public MatriculaInternaController(PedidoRepository pedidos) { this.pedidos = pedidos; }

    @GetMapping("/validacion")
    public ResponseEntity<Validacion> validar(@RequestParam UUID cursoId, @RequestParam UUID estudianteId,
                                             HttpServletRequest request) {
        AuthPrincipal principal = AuthPrincipal.from(request);
        if (!principal.isService() || !"cursos-service".equals(principal.subject())) {
            throw new AuthPrincipal.ForbiddenException("Servicio no autorizado");
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new Validacion(
                pedidos.existsByCursoIdAndEstudianteIdAndEstado(cursoId, estudianteId, EstadoPedido.PAGADO)));
    }

    public record Validacion(boolean habilitada) {}
}
