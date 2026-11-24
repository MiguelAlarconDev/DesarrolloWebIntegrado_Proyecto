package com.curso.gateway.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Capa 1: control por IP.
 * 1) Lista negra fija (SECURITY_BLOCKED_IPS) -> 403.
 * 2) Bloqueo temporal dinamico (fuerza bruta, abuso o manual) -> 403.
 * 3) Rate limit por minuto (general y de autenticacion) -> 429.
 * 4) Tras la respuesta: cuenta los 401 de login/2FA para detectar fuerza bruta.
 */
@Component
@Order(1)
public class IpBlockFilter extends OncePerRequestFilter {

    private static final Set<String> AUTH_PATHS = Set.of(
            "/api/auth/login", "/api/auth/verificar-2fa", "/api/auth/registro", "/api/auth/reenviar-2fa");

    private final ClientIpResolver clientIpResolver;
    private final Set<String> blockedIps;
    private final IpProtectionService protection;

    @Autowired
    public IpBlockFilter(
            ClientIpResolver clientIpResolver,
            @Value("${security.blocked-ips:${SECURITY_BLOCKED_IPS:}}") String blockedIps,
            IpProtectionService protection) {
        this.clientIpResolver = clientIpResolver;
        this.blockedIps = Arrays.stream(blockedIps.split(","))
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .collect(Collectors.toSet());
        this.protection = protection;
    }

    public IpBlockFilter(ClientIpResolver clientIpResolver, String blockedIps) {
        this(clientIpResolver, blockedIps, IpProtectionService.defaults());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String clientIp = clientIpResolver.resolve(request);
        request.setAttribute("client.ip", clientIp);

        if (blockedIps.contains(clientIp)) {
            JsonErrors.write(response, HttpServletResponse.SC_FORBIDDEN, "Forbidden", "IP bloqueada");
            return;
        }

        IpProtectionService.Bloqueo bloqueo = protection.activeBan(clientIp);
        if (bloqueo != null) {
            long segundos = Math.max(1, bloqueo.hasta().getEpochSecond() - java.time.Instant.now().getEpochSecond());
            response.setHeader("Retry-After", String.valueOf(segundos));
            JsonErrors.write(response, HttpServletResponse.SC_FORBIDDEN, "Forbidden",
                    "IP bloqueada temporalmente: " + bloqueo.motivo());
            return;
        }

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        boolean authPath = AUTH_PATHS.contains(request.getRequestURI());
        boolean allowed = protection.tryAcquire(clientIp, IpProtectionService.Bucket.GENERAL)
                && (!authPath || protection.tryAcquire(clientIp, IpProtectionService.Bucket.AUTH));
        if (!allowed) {
            response.setHeader("Retry-After", "60");
            JsonErrors.write(response, 429, "Too Many Requests",
                    "Demasiadas solicitudes. Intente nuevamente en un minuto.");
            return;
        }

        filterChain.doFilter(request, response);

        if (authPath && !request.getRequestURI().endsWith("/registro")) {
            if (response.getStatus() == HttpServletResponse.SC_UNAUTHORIZED
                    || response.getStatus() == 423) {
                protection.registerAuthFailure(clientIp);
            } else if (response.getStatus() >= 200 && response.getStatus() < 300) {
                protection.registerAuthSuccess(clientIp);
            }
        }
    }
}
