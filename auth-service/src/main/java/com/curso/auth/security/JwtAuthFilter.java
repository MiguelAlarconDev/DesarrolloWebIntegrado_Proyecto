package com.curso.auth.security;

import com.curso.auth.exception.AuthenticationException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;

/**
 * Autorizacion propia de auth-service (no depende solo del Gateway).
 * Publicos: login, registro y verificacion 2FA. Resto de /api/auth/**: JWT valido.
 *  - GET /api/auth/usuarios        -> ADMIN o SERVICE
 *  - GET /api/auth/usuarios/{id}   -> ADMIN, SERVICE o el propio usuario
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    static final Set<String> PUBLIC_POST = Set.of(
            "/api/auth/login",
            "/api/auth/registro",
            "/api/auth/verificar-2fa"
    );

    private final JwtService jwtService;

    public JwtAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return "OPTIONS".equalsIgnoreCase(request.getMethod()) || !request.getRequestURI().startsWith("/api/auth");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        boolean isPublic = "POST".equalsIgnoreCase(request.getMethod()) && PUBLIC_POST.contains(path);
        String authorization = request.getHeader("Authorization");
        boolean hasBearer = authorization != null && authorization.startsWith("Bearer ");

        if (!hasBearer) {
            if (isPublic) {
                chain.doFilter(request, response);
            } else {
                write(response, HttpServletResponse.SC_UNAUTHORIZED, "Token JWT requerido");
            }
            return;
        }

        AccessPrincipal principal;
        try {
            principal = jwtService.validateAccessToken(authorization.substring(7).trim());
        } catch (AuthenticationException ex) {
            if (isPublic) {
                // Un token viejo/expirado no debe impedir iniciar sesion o registrarse.
                chain.doFilter(request, response);
            } else {
                write(response, HttpServletResponse.SC_UNAUTHORIZED, ex.getMessage());
            }
            return;
        }
        if (!isPublic && !allowed(request.getMethod(), path, principal)) {
            write(response, HttpServletResponse.SC_FORBIDDEN, "Permisos insuficientes");
            return;
        }
        request.setAttribute(AccessPrincipal.REQUEST_ATTRIBUTE, principal);
        chain.doFilter(request, response);
    }

    static boolean allowed(String method, String path, AccessPrincipal p) {
        if (!"GET".equalsIgnoreCase(method)) {
            return false;
        }
        if (p.isAdmin() || p.isService()) {
            return path.equals("/api/auth/usuarios") || path.startsWith("/api/auth/usuarios/");
        }
        if (path.startsWith("/api/auth/usuarios/")) {
            try {
                return p.isUser(UUID.fromString(path.substring("/api/auth/usuarios/".length())));
            } catch (IllegalArgumentException ex) {
                return false;
            }
        }
        return false;
    }

    private static void write(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"status\":" + status + ",\"message\":\"" + message + "\"}");
    }
}
