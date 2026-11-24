package com.curso.gateway.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Capa 0: cabeceras de seguridad HTTP y un identificador de solicitud para trazabilidad.
 */
@Component
@Order(0)
public class SecurityHeadersFilter extends OncePerRequestFilter {

    public static final String REQUEST_ID = "X-Request-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String requestId = request.getHeader(REQUEST_ID);
        if (requestId == null || requestId.isBlank() || requestId.length() > 64) {
            requestId = UUID.randomUUID().toString();
        }
        request.setAttribute(REQUEST_ID, requestId);
        response.setHeader(REQUEST_ID, requestId);
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("Referrer-Policy", "no-referrer");
        response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
        response.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
        response.setHeader("Cache-Control", "no-store");
        if (request.isSecure() || "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto"))) {
            response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        }
        filterChain.doFilter(request, response);
    }
}
