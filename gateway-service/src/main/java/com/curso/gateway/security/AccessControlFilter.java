package com.curso.gateway.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Capas 3 y 4: autenticacion JWT y autorizacion por niveles (ver {@link AccessPolicy}).
 * <p>
 * Si la solicitud pasa, se reenvia al microservicio con cabeceras de confianza:
 * X-User-Id, X-User-Role, X-User-Email y X-Internal-Key. Las cabeceras con esos nombres
 * que envie el cliente se descartan, asi nadie puede hacerse pasar por otro usuario.
 */
@Component
@Order(3)
public class AccessControlFilter extends OncePerRequestFilter {

    public static final String H_USER_ID = "X-User-Id";
    public static final String H_USER_ROLE = "X-User-Role";
    public static final String H_USER_EMAIL = "X-User-Email";
    public static final String H_INTERNAL_KEY = "X-Internal-Key";

    private static final List<String> TRUSTED_HEADERS = List.of(
            H_USER_ID.toLowerCase(Locale.ROOT), H_USER_ROLE.toLowerCase(Locale.ROOT),
            H_USER_EMAIL.toLowerCase(Locale.ROOT), H_INTERNAL_KEY.toLowerCase(Locale.ROOT),
            SecurityHeadersFilter.REQUEST_ID.toLowerCase(Locale.ROOT));

    private final GatewayJwtService jwtService;
    private final String internalKey;

    public AccessControlFilter(GatewayJwtService jwtService,
                               @Value("${security.internal-key:${INTERNAL_API_KEY:}}") String internalKey) {
        this.jwtService = jwtService;
        this.internalKey = internalKey;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        Optional<AccessPolicy.Resultado> resultado = AccessPolicy.evaluar(request.getMethod(), path);
        if (resultado.isEmpty()) {
            JsonErrors.write(response, HttpServletResponse.SC_NOT_FOUND, "Not Found", "Ruta no disponible");
            return;
        }
        AccessPolicy.Regla regla = resultado.get().regla();

        if (regla.tipo() == AccessPolicy.Tipo.INTERNO) {
            JsonErrors.write(response, HttpServletResponse.SC_FORBIDDEN, "Forbidden",
                    "Operacion interna: no disponible desde el exterior");
            return;
        }

        Map<String, Object> claims = null;
        String authorization = request.getHeader("Authorization");
        boolean hasToken = authorization != null && authorization.startsWith("Bearer ");

        if (regla.tipo() == AccessPolicy.Tipo.ROLES || (regla.tipo() == AccessPolicy.Tipo.OPCIONAL && hasToken)) {
            if (!hasToken) {
                JsonErrors.write(response, HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized", "Token JWT requerido");
                return;
            }
            try {
                claims = jwtService.validate(authorization.substring(7));
            } catch (Exception ex) {
                JsonErrors.write(response, HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized", "Token JWT invalido o expirado");
                return;
            }
        }

        if (claims != null && regla.tipo() == AccessPolicy.Tipo.ROLES) {
            AccessPolicy.Rol rol = parseRol(claims.get("rol"));
            if (rol == null || !regla.roles().contains(rol)) {
                JsonErrors.write(response, HttpServletResponse.SC_FORBIDDEN, "Forbidden",
                        "Su rol no tiene permiso para esta operacion");
                return;
            }
            if (regla.ownerVar() != null && rol != AccessPolicy.Rol.ADMIN) {
                String expected = String.valueOf(claims.get("sub"));
                String actual = resultado.get().variables().get(regla.ownerVar());
                if (!expected.equalsIgnoreCase(actual)) {
                    JsonErrors.write(response, HttpServletResponse.SC_FORBIDDEN, "Forbidden",
                            "Solo puede consultar sus propios datos");
                    return;
                }
            }
            request.setAttribute("jwt.claims", claims);
        }

        Map<String, String> forwarded = new LinkedHashMap<>();
        if (claims != null) {
            forwarded.put(H_USER_ID, String.valueOf(claims.get("sub")));
            forwarded.put(H_USER_ROLE, String.valueOf(claims.get("rol")));
            if (claims.get("correo") != null) {
                forwarded.put(H_USER_EMAIL, String.valueOf(claims.get("correo")));
            }
        }
        if (internalKey != null && !internalKey.isBlank()) {
            forwarded.put(H_INTERNAL_KEY, internalKey);
        }
        Object requestId = request.getAttribute(SecurityHeadersFilter.REQUEST_ID);
        if (requestId != null) {
            forwarded.put(SecurityHeadersFilter.REQUEST_ID, requestId.toString());
        }

        filterChain.doFilter(new TrustedHeadersRequest(request, forwarded), response);
    }

    private static AccessPolicy.Rol parseRol(Object value) {
        try {
            return value == null ? null : AccessPolicy.Rol.valueOf(value.toString());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    /** Elimina las cabeceras de confianza enviadas por el cliente y agrega las del gateway. */
    static final class TrustedHeadersRequest extends HttpServletRequestWrapper {
        private final Map<String, String> added = new LinkedHashMap<>();

        TrustedHeadersRequest(HttpServletRequest request, Map<String, String> added) {
            super(request);
            added.forEach((k, v) -> this.added.put(k.toLowerCase(Locale.ROOT), v));
        }

        @Override
        public String getHeader(String name) {
            String key = name.toLowerCase(Locale.ROOT);
            if (added.containsKey(key)) {
                return added.get(key);
            }
            return TRUSTED_HEADERS.contains(key) ? null : super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            String key = name.toLowerCase(Locale.ROOT);
            if (added.containsKey(key)) {
                return Collections.enumeration(List.of(added.get(key)));
            }
            return TRUSTED_HEADERS.contains(key) ? Collections.emptyEnumeration() : super.getHeaders(name);
        }

        @Override
        public Enumeration<String> getHeaderNames() {
            List<String> names = new java.util.ArrayList<>();
            Enumeration<String> original = super.getHeaderNames();
            while (original.hasMoreElements()) {
                String name = original.nextElement();
                if (!TRUSTED_HEADERS.contains(name.toLowerCase(Locale.ROOT))) {
                    names.add(name);
                }
            }
            names.addAll(added.keySet());
            return Collections.enumeration(names);
        }
    }
}
