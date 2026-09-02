package com.curso.cursos.dto;

import com.curso.cursos.entity.ModalidadCurso;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import org.hibernate.validator.constraints.URL;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class CrearCursoRequest {

    @NotBlank(message = "El título del curso es obligatorio")
    private String titulo;

    private String descripcion;

    @NotNull(message = "El ID del docente es obligatorio")
    private UUID docenteId;

    @NotNull(message = "La fecha de inicio es obligatoria")
    private LocalDateTime fechaInicio;

    @NotNull(message = "La fecha de fin es obligatoria")
    private LocalDateTime fechaFin;

    @NotBlank(message = "El horario es obligatorio")
    private String horario;

    private ModalidadCurso modalidad = ModalidadCurso.VIRTUAL;

    @NotNull(message = "El aforo máximo es obligatorio")
    @Positive(message = "El aforo debe ser mayor a cero")
    private Integer aforoMaximo;

    @NotNull(message = "El precio es obligatorio")
    @PositiveOrZero(message = "El precio no puede ser negativo")
    private BigDecimal precio;

    @URL(message = "Debe ser una URL valida")
    private String enlaceClase;

    private String direccionClase;

    private String aula;

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public UUID getDocenteId() {
        return docenteId;
    }

    public void setDocenteId(UUID docenteId) {
        this.docenteId = docenteId;
    }

    public LocalDateTime getFechaInicio() {
        return fechaInicio;
    }

    public void setFechaInicio(LocalDateTime fechaInicio) {
        this.fechaInicio = fechaInicio;
    }

    public LocalDateTime getFechaFin() {
        return fechaFin;
    }

    public void setFechaFin(LocalDateTime fechaFin) {
        this.fechaFin = fechaFin;
    }

    public String getHorario() {
        return horario;
    }

    public void setHorario(String horario) {
        this.horario = horario;
    }

    public ModalidadCurso getModalidad() {
        return modalidad;
    }

    public void setModalidad(ModalidadCurso modalidad) {
        this.modalidad = modalidad;
    }

    public Integer getAforoMaximo() {
        return aforoMaximo;
    }

    public void setAforoMaximo(Integer aforoMaximo) {
        this.aforoMaximo = aforoMaximo;
    }

    public BigDecimal getPrecio() {
        return precio;
    }

    public void setPrecio(BigDecimal precio) {
        this.precio = precio;
    }

    public String getEnlaceClase() {
        return enlaceClase;
    }

    public void setEnlaceClase(String enlaceClase) {
        this.enlaceClase = enlaceClase;
    }

    public String getDireccionClase() {
        return direccionClase;
    }

    public void setDireccionClase(String direccionClase) {
        this.direccionClase = direccionClase;
    }

    public String getAula() {
        return aula;
    }

    public void setAula(String aula) {
        this.aula = aula;
    }
}
