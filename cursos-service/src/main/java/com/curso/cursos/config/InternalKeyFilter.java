package com.curso.cursos.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Capa 5 (defensa en profundidad): el servicio solo acepta solicitudes que traen la clave
 * interna (X-Internal-Key), es decir, que vienen del gateway o de otro microservicio.
 * Asi, aunque el servicio tenga URL propia en otro servidor, no se puede llamar saltando el gateway.
 * Si INTERNAL_API_KEY esta vacia (desarrollo local) el filtro no exige nada.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class InternalKeyFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Internal-Key";

    private final byte[] expected;

    public InternalKeyFilter(@Value("${security.internal-key:${INTERNAL_API_KEY:}}") String internalKey) {
        this.expected = internalKey == null ? new byte[0] : internalKey.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (expected.length == 0 || request.getRequestURI().startsWith("/actuator/health")) {
            chain.doFilter(request, response);
            return;
        }
        String provided = request.getHeader(HEADER);
        if (provided == null || !MessageDigest.isEqual(expected, provided.getBytes(StandardCharsets.UTF_8))) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"status\":401,\"error\":\"Unauthorized\",\"message\":\"Acceso solo a traves del gateway\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
