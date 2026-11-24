package com.curso.gateway.security;

import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

/**
 * Responde errores del gateway directamente en JSON. Se evita sendError() porque
 * reenvia a /error, que la ruta catch-all del frontend entrega como HTML con 200.
 */
final class GatewayErrors {

    private GatewayErrors() {
    }

    static void write(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"status\":" + status + ",\"message\":\"" + message + "\"}");
    }
}
