package com.curso.gateway.security;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Gestion de IPs bloqueadas (solo ADMIN, regla /api/seguridad/** en {@link AccessPolicy}).
 */
@RestController
@RequestMapping("/api/seguridad/bloqueos")
public class SeguridadController {

    private static final Pattern IP = Pattern.compile("^[0-9a-fA-F:.]{3,45}$");

    private final IpProtectionService protection;

    public SeguridadController(IpProtectionService protection) {
        this.protection = protection;
    }

    @GetMapping
    public List<IpProtectionService.Bloqueo> listar() {
        return protection.activeBans();
    }

    public record BloqueoRequest(String ip, Integer minutos, String motivo) {
    }

    @PostMapping
    public ResponseEntity<?> bloquear(@RequestBody BloqueoRequest request) {
        if (request == null || request.ip() == null || !IP.matcher(request.ip()).matches()) {
            return ResponseEntity.badRequest().body(Map.of("message", "IP invalida"));
        }
        int minutos = request.minutos() == null ? 60 : Math.max(1, Math.min(request.minutos(), 60 * 24 * 30));
        String motivo = request.motivo() == null || request.motivo().isBlank() ? "Bloqueo manual" : request.motivo().trim();
        if (motivo.length() > 200) {
            motivo = motivo.substring(0, 200);
        }
        return ResponseEntity.ok(protection.ban(request.ip(), Duration.ofMinutes(minutos), motivo, true));
    }

    @DeleteMapping("/{ip}")
    public ResponseEntity<Map<String, Object>> desbloquear(@PathVariable String ip) {
        boolean eliminado = protection.unban(ip);
        return ResponseEntity.ok(Map.of("ip", ip, "desbloqueado", eliminado));
    }
}
