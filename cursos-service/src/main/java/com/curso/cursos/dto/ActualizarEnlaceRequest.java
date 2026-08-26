package com.curso.cursos.dto;

import jakarta.validation.constraints.NotBlank;
import org.hibernate.validator.constraints.URL;

public class ActualizarEnlaceRequest {

    @NotBlank(message = "El enlace de clase no puede estar vacío")
    @URL(message = "Debe ser una URL válida (ej. Google Meet o Zoom)")
    private String enlaceClase;

    public String getEnlaceClase() {
        return enlaceClase;
    }

    public void setEnlaceClase(String enlaceClase) {
        this.enlaceClase = enlaceClase;
    }
}
