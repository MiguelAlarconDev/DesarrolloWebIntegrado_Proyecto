package com.curso.cursos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class RegistrarAsistenciaRequest {

    @NotNull(message = "El ID del curso es obligatorio")
    private UUID cursoId;

    @NotNull(message = "El ID del estudiante es obligatorio")
    private UUID estudianteId;

    @NotNull(message = "El número de sesión es obligatorio")
    private Integer numeroSesion;

    @NotBlank(message = "La fecha de sesión es obligatoria")
    private String fechaSesion;

    private String temaSesion;

    @NotBlank(message = "El estado de asistencia es obligatorio (P, T, FJ, F)")
    private String estado; // "P", "T", "FJ", "F"

    private String observaciones;

    private UUID docenteId;

    public RegistrarAsistenciaRequest() {
    }

    public UUID getCursoId() {
        return cursoId;
    }

    public void setCursoId(UUID cursoId) {
        this.cursoId = cursoId;
    }

    public UUID getEstudianteId() {
        return estudianteId;
    }

    public void setEstudianteId(UUID estudianteId) {
        this.estudianteId = estudianteId;
    }

    public Integer getNumeroSesion() {
        return numeroSesion;
    }

    public void setNumeroSesion(Integer numeroSesion) {
        this.numeroSesion = numeroSesion;
    }

    public String getFechaSesion() {
        return fechaSesion;
    }

    public void setFechaSesion(String fechaSesion) {
        this.fechaSesion = fechaSesion;
    }

    public String getTemaSesion() {
        return temaSesion;
    }

    public void setTemaSesion(String temaSesion) {
        this.temaSesion = temaSesion;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public String getObservaciones() {
        return observaciones;
    }

    public void setObservaciones(String observaciones) {
        this.observaciones = observaciones;
    }

    public UUID getDocenteId() {
        return docenteId;
    }

    public void setDocenteId(UUID docenteId) {
        this.docenteId = docenteId;
    }
}
