package com.curso.cursos.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "calificaciones", uniqueConstraints = {
    @UniqueConstraint(name = "uq_calificacion_curso_estudiante", columnNames = {"curso_id", "estudiante_id"})
})
public class Calificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "curso_id", nullable = false)
    private UUID cursoId;

    @Column(name = "estudiante_id", nullable = false)
    private UUID estudianteId;

    @Column(name = "ec1")
    private Double ec1 = 0.0; // 20%

    @Column(name = "ec2")
    private Double ec2 = 0.0; // 30%

    @Column(name = "proyecto_final")
    private Double proyectoFinal = 0.0; // 50%

    @Column(name = "promedio_final")
    private Double promedioFinal = 0.0;

    @Column(length = 30)
    private String condicion = "EN_CURSO"; // "APROBADO", "DESAPROBADO", "EN_CURSO"

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "actualizado_por")
    private UUID actualizadoPor;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    public Calificacion() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
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

    public Double getPromedioFinal() {
        return promedioFinal;
    }

    public void setPromedioFinal(Double promedioFinal) {
        this.promedioFinal = promedioFinal;
    }

    public String getCondicion() {
        return condicion;
    }

    public void setCondicion(String condicion) {
        this.condicion = condicion;
    }

    public String getFeedback() {
        return feedback;
    }

    public void setFeedback(String feedback) {
        this.feedback = feedback;
    }

    public UUID getActualizadoPor() {
        return actualizadoPor;
    }

    public void setActualizadoPor(UUID actualizadoPor) {
        this.actualizadoPor = actualizadoPor;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public void calcularPromedioYCondicion() {
        double vEc1 = (this.ec1 != null) ? this.ec1 : 0.0;
        double vEc2 = (this.ec2 != null) ? this.ec2 : 0.0;
        double vPf = (this.proyectoFinal != null) ? this.proyectoFinal : 0.0;

        // Fórmula ponderada: EC1 (20%) + EC2 (30%) + PF (50%)
        double calculado = (vEc1 * 0.20) + (vEc2 * 0.30) + (vPf * 0.50);
        this.promedioFinal = Math.round(calculado * 10.0) / 10.0;

        if (this.promedioFinal >= 14.0) {
            this.condicion = "APROBADO";
        } else if (vPf > 0.0 || (vEc1 > 0.0 && vEc2 > 0.0)) {
            this.condicion = "DESAPROBADO";
        } else {
            this.condicion = "EN_CURSO";
        }
        this.updatedAt = LocalDateTime.now();
    }
}
