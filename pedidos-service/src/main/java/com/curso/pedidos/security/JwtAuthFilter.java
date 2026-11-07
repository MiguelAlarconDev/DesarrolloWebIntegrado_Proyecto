package com.curso.pedidos.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * Autorizacion dentro de pedidos-service (no depende solo del Gateway).
 * Publicos: webhooks de proveedores (validan su propia firma) y preflight CORS.
 * Resto: JWT valido; reglas de rol aqui y reglas de propiedad en el controlador.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Set<String> PUBLIC_PATHS = Set.of(
            "/api/pedidos/webhook",
            "/api/pedidos/whatsapp/webhook"
    );

    private final JwtVerifier jwtVerifier;

    public JwtAuthFilter(JwtVerifier jwtVerifier) {
        this.jwtVerifier = jwtVerifier;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return "OPTIONS".equalsIgnoreCase(request.getMethod())
                || !(path.startsWith("/api/pedidos") || path.startsWith("/api/pagos"))
                || PUBLIC_PATHS.contains(path);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
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
        if (!roleAllowed(request.getMethod(), request.getRequestURI(), principal)) {
            write(response, HttpServletResponse.SC_FORBIDDEN, "Permisos insuficientes");
            return;
        }
        request.setAttribute(AuthPrincipal.REQUEST_ATTRIBUTE, principal);
        chain.doFilter(request, response);
    }

    static boolean roleAllowed(String method, String path, AuthPrincipal p) {
        if (p.isService()) {
            return "GET".equalsIgnoreCase(method);
        }
        // Preferencias genericas, pruebas de proveedores y reenvios: solo ADMIN.
        if (path.startsWith("/api/pagos") ||path.startsWith("/api/pedidos/whatsapp/") || path.startsWith("/api/pedidos/email/")
                || path.endsWith("/whatsapp/reenviar")) {
            return p.isAdmin();
        }
        // Listados globales con datos personales: ADMIN o DOCENTE.
        if ("GET".equalsIgnoreCase(method)
                && (path.equals("/api/pedidos") || path.startsWith("/api/pedidos/curso/"))) {
            return p.isStaff();
        }
        // El resto (checkout, pagar, cancelar, consultas propias) requiere usuario
        // autenticado; la propiedad del pedido se valida en el controlador.
        return true;
    }

    private static void write(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"status\":" + status + ",\"message\":\"" + message + "\"}");
    }
}
