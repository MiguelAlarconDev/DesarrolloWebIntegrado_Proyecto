package com.cursos.aula;

import java.time.Duration;

/** Almacenamiento privado de materiales. Las credenciales nunca salen del backend. */
public interface AlmacenamientoArchivos {

    boolean isConfigurado();

    void subir(String objectKey, byte[] contenido, String mimeType);

    /** Idempotente: eliminar un objeto inexistente no es un error. */
    void eliminar(String objectKey);

    /** URL firmada de solo lectura y corta duracion; nunca debe registrarse en logs. */
    String urlFirmada(String objectKey, Duration vigencia, String nombreDescarga);

    class NoDisponibleException extends RuntimeException {
        public NoDisponibleException(String message) {
            super(message);
        }
    }
}
