package com.curso.pedidos.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class CrearPedidoRequest {

    @NotNull(message = "El ID del estudiante es obligatorio")
    private UUID estudianteId;

    @NotNull(message = "El ID del curso es obligatorio")
    private UUID cursoId;

    public UUID getEstudianteId() { return estudianteId; }
    public void setEstudianteId(UUID estudianteId) { this.estudianteId = estudianteId; }
    public UUID getCursoId() { return cursoId; }
    public void setCursoId(UUID cursoId) { this.cursoId = cursoId; }
}
