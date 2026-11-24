package com.curso.gateway.security;

import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.time.Instant;

/** Respuestas de error JSON uniformes para los filtros del gateway. */
final class JsonErrors {

    private JsonErrors() {
    }

    static void write(HttpServletResponse response, int status, String error, String message) throws IOException {
        if (response.isCommitted()) {
            return;
        }
        response.resetBuffer();
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"timestamp\":\"" + Instant.now() + "\",\"status\":" + status
                + ",\"error\":\"" + escape(error) + "\",\"message\":\"" + escape(message) + "\"}");
    }

    private static String escape(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
