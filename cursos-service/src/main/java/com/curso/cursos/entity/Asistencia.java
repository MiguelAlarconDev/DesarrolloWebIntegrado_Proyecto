package com.curso.cursos.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "asistencias", uniqueConstraints = {
    @UniqueConstraint(name = "uq_asistencia_curso_estudiante_sesion", columnNames = {"curso_id", "estudiante_id", "numero_sesion"})
})
public class Asistencia {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "curso_id", nullable = false)
    private UUID cursoId;

    @Column(name = "estudiante_id", nullable = false)
    private UUID estudianteId;

    @Column(name = "numero_sesion", nullable = false)
    private Integer numeroSesion;

    @Column(name = "fecha_sesion", nullable = false, length = 20)
    private String fechaSesion; // YYYY-MM-DD

    @Column(name = "tema_sesion")
    private String temaSesion;

    @Column(nullable = false, length = 5)
    private String estado; // "P" (Presente), "T" (Tardanza), "FJ" (Falta Justificada), "F" (Falta)

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    @Column(name = "registrado_por")
    private UUID registradoPor;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public Asistencia() {
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
        this.estado = (estado != null) ? estado.toUpperCase().trim() : "F";
    }

    public String getObservaciones() {
        return observaciones;
    }

    public void setObservaciones(String observaciones) {
        this.observaciones = observaciones;
    }

    public UUID getRegistradoPor() {
        return registradoPor;
    }

    public void setRegistradoPor(UUID registradoPor) {
        this.registradoPor = registradoPor;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
