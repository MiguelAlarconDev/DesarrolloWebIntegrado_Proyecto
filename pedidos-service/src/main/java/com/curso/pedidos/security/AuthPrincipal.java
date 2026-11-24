package com.curso.pedidos.security;

import jakarta.servlet.http.HttpServletRequest;

import java.util.UUID;

/** Identidad autenticada de la peticion (usuario o servicio interno). */
public record AuthPrincipal(String subject, String rol) {

    public static final String REQUEST_ATTRIBUTE = "auth.principal";
    public static final String ROL_SERVICE = "SERVICE";

    public boolean isAdmin() {
        return "ADMIN".equals(rol);
    }

    public boolean isStaff() {
        return "ADMIN".equals(rol) || "DOCENTE".equals(rol);
    }

    public boolean isService() {
        return ROL_SERVICE.equals(rol);
    }

    public boolean isUser(UUID userId) {
        return userId != null && userId.toString().equalsIgnoreCase(subject);
    }

    public static AuthPrincipal from(HttpServletRequest request) {
        Object value = request.getAttribute(REQUEST_ATTRIBUTE);
        if (value instanceof AuthPrincipal principal) {
            return principal;
        }
        throw new ForbiddenException("Autenticacion requerida");
    }

    /** Lanza 403 si el usuario no es el propietario ni personal autorizado. */
    public void requireOwnerOrStaff(UUID ownerId) {
        if (!isStaff() && !isService() && !isUser(ownerId)) {
            throw new ForbiddenException("No tiene permisos sobre este recurso");
        }
    }

    /** Lanza 403 si no es el propietario ni ADMIN (operaciones que modifican estado). */
    public void requireOwnerOrAdmin(UUID ownerId) {
        if (!isAdmin() && !isUser(ownerId)) {
            throw new ForbiddenException("No tiene permisos sobre este recurso");
        }
    }

    public static class ForbiddenException extends RuntimeException {
        public ForbiddenException(String message) {
            super(message);
        }
    }
}
