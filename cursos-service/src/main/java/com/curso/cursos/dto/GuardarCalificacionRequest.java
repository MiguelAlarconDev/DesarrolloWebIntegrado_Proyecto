package com.curso.cursos.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class GuardarCalificacionRequest {

    @NotNull(message = "El ID del curso es obligatorio")
    private UUID cursoId;

    @NotNull(message = "El ID del estudiante es obligatorio")
    private UUID estudianteId;

    @DecimalMin(value = "0.0", message = "EC1 no puede ser menor a 0")
    @DecimalMax(value = "20.0", message = "EC1 no puede ser mayor a 20")
    private Double ec1;

    @DecimalMin(value = "0.0", message = "EC2 no puede ser menor a 0")
    @DecimalMax(value = "20.0", message = "EC2 no puede ser mayor a 20")
    private Double ec2;

    @DecimalMin(value = "0.0", message = "El proyecto final no puede ser menor a 0")
    @DecimalMax(value = "20.0", message = "El proyecto final no puede ser mayor a 20")
    private Double proyectoFinal;

    private String feedback;

    @JsonAlias({"actualizadoPor", "docenteId"})
    private UUID docenteId;

    public GuardarCalificacionRequest() {
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

    public Double getEc1() {
        return ec1;
    }

    public void setEc1(Double ec1) {
        this.ec1 = ec1;
    }

    public Double getEc2() {
        return ec2;
    }

    public void setEc2(Double ec2) {
        this.ec2 = ec2;
    }

    public Double getProyectoFinal() {
        return proyectoFinal;
    }

    public void setProyectoFinal(Double proyectoFinal) {
        this.proyectoFinal = proyectoFinal;
    }

    public String getFeedback() {
        return feedback;
    }

    public void setFeedback(String feedback) {
        this.feedback = feedback;
    }

    public UUID getDocenteId() {
        return docenteId;
    }

    public void setDocenteId(UUID docenteId) {
        this.docenteId = docenteId;
    }
}
