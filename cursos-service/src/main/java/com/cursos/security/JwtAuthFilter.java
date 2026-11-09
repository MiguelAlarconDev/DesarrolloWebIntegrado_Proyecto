package com.cursos.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Catalogo (GET) publico excepto el subarbol privado /{cursoId}/aula.
 * Aula requiere JWT de DOCENTE/ESTUDIANTE y autorizacion por recurso en AulaService.
 * Operaciones que modifican estado fuera del aula requieren JWT:
 *  - descontar/liberar aforo: SERVICE (pedidos-service) o ADMIN
 *  - crear curso, enlace, datos de clase, estado: ADMIN o DOCENTE
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtVerifier jwtVerifier;

    public JwtAuthFilter(JwtVerifier jwtVerifier) {
        this.jwtVerifier = jwtVerifier;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String method = request.getMethod();
        String path = request.getRequestURI();
        return "OPTIONS".equalsIgnoreCase(method)
                || ("GET".equalsIgnoreCase(method) && !isAula(path) && !isCertificadoPrivado(path))
                || !path.startsWith("/api/cursos")
                || isVerificacionPublica(path);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (isAula(request.getRequestURI()) || isCertificadoPrivado(request.getRequestURI())) {
            // Respuestas del aula (incluidos 401/403) nunca deben cachearse.
            response.setHeader("Cache-Control", "no-store");
        }
        String authorization = request.getHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            write(response, HttpServletResponse.SC_UNAUTHORIZED, "Token JWT requerido");
            return;
        }
        AuthPrincipal principal;
        try {
            principal = jwtVerifier.validate(authorization.substring(7).trim());
        } catch (JwtVerifier.InvalidTokenException ex) {
            write(response, HttpServletResponse.SC_UNAUTHORIZED, ex.getMessage());
            return;
        }
        if (!allowed(request.getRequestURI(), principal)) {
            write(response, HttpServletResponse.SC_FORBIDDEN, "Permisos insuficientes");
            return;
        }
        request.setAttribute(AuthPrincipal.REQUEST_ATTRIBUTE, principal);
        chain.doFilter(request, response);
    }

    static boolean allowed(String path, AuthPrincipal p) {
        if (isCertificadoPrivado(path)) {
            // ADMIN administra certificados (sin acceso al aula); el estudiante solo lo propio (servicio).
            if (path.startsWith("/api/cursos/certificados/admin")) return p.isAdmin();
            return p.isAdmin() || "ESTUDIANTE".equals(p.rol());
        }
        if (isAula(path)) {
            return "DOCENTE".equals(p.rol()) || "ESTUDIANTE".equals(p.rol());
        }
        if (path.endsWith("/descontar-aforo") || path.endsWith("/liberar-aforo")) {
            return p.isService() || p.isAdmin();
        }
        return p.isStaff();
    }

    private static final String CERTIFICADOS = "/api/cursos/certificados";

    private static boolean isVerificacionPublica(String path) {
        return path.startsWith(CERTIFICADOS + "/verificacion/");
    }

    private static boolean isCertificadoPrivado(String path) {
        return (path.equals(CERTIFICADOS) || path.startsWith(CERTIFICADOS + "/")) && !isVerificacionPublica(path);
    }

    private static boolean isAula(String path) {
        // Protect the whole subtree, including future material endpoints and path parameters.
        return path.matches("^/api/cursos/[^/]+/aula(?:[/;].*)?$");
    }

    private static void write(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"status\":" + status + ",\"message\":\"" + message + "\"}");
    }
}
