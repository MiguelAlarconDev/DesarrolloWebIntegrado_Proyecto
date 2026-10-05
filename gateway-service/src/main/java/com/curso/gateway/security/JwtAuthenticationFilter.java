package com.curso.gateway.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Component
@Order(3)
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final GatewayJwtService jwtService;
    private final List<String> protectedPaths;

    public JwtAuthenticationFilter(
            GatewayJwtService jwtService,
            @Value("${security.jwt.protected-paths:${JWT_PROTECTED_PATHS:/api/auth/usuarios}}") String protectedPaths) {
        this.jwtService = jwtService;
        this.protectedPaths = Arrays.stream(protectedPaths.split(","))
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .toList();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!isProtected(request.getRequestURI())) {
            filterChain.doFilter(request, response);
            return;
        }

        String authorization = request.getHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token JWT requerido");
            return;
        }

        try {
            Map<String, Object> claims = jwtService.validate(authorization.substring(7));
            request.setAttribute("jwt.claims", claims);
            filterChain.doFilter(request, response);
        } catch (Exception ex) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token JWT invalido o expirado");
        }
    }

    private boolean isProtected(String path) {
        return protectedPaths.stream().anyMatch(path::startsWith);
    }
}
