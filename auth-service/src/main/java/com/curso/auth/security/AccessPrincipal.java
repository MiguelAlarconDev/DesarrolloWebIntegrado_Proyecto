package com.curso.auth.security;

import jakarta.servlet.http.HttpServletRequest;

import java.util.UUID;

/** Identidad autenticada de la peticion: usuario (ADMIN/DOCENTE/ESTUDIANTE) o servicio interno. */
public record AccessPrincipal(String subject, String rol) {

    public static final String REQUEST_ATTRIBUTE = "auth.principal";
    public static final String ROL_SERVICE = "SERVICE";

    public boolean isAdmin() {
        return "ADMIN".equals(rol);
    }

    public boolean isService() {
        return ROL_SERVICE.equals(rol);
    }

    public boolean isUser(UUID id) {
        return id != null && id.toString().equalsIgnoreCase(subject);
    }

    /** Principal opcional (p. ej. en /registro, que es publico). */
    public static AccessPrincipal fromOrNull(HttpServletRequest request) {
        Object value = request.getAttribute(REQUEST_ATTRIBUTE);
        return value instanceof AccessPrincipal p ? p : null;
    }
}
