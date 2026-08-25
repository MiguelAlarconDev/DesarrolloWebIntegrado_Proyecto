package com.curso.pedidos.dto;

import jakarta.validation.constraints.NotBlank;

public class ActualizarEnlaceRequest {

    @NotBlank(message = "El enlace de clase no puede estar vacío")
    private String enlaceClase;

    public String getEnlaceClase() { return enlaceClase; }
    public void setEnlaceClase(String enlaceClase) { this.enlaceClase = enlaceClase; }
}
