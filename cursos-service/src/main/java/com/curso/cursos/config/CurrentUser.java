package com.curso.cursos.config;

import jakarta.servlet.http.HttpServletRequest;

import java.util.UUID;

/** Usuario autenticado segun las cabeceras de confianza que agrega el gateway. */
public record CurrentUser(UUID id, String rol) {

    public static CurrentUser from(HttpServletRequest request) {
        String id = request.getHeader("X-User-Id");
        String rol = request.getHeader("X-User-Role");
        if (id == null || rol == null) {
            return null;
        }
        try {
            return new CurrentUser(UUID.fromString(id), rol);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    public boolean isAdmin() {
        return "ADMIN".equals(rol);
    }

    public boolean isDocente() {
        return "DOCENTE".equals(rol);
    }
}
