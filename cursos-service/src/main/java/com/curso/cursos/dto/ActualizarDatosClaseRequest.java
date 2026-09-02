package com.curso.cursos.dto;

import com.curso.cursos.entity.ModalidadCurso;
import jakarta.validation.constraints.NotNull;

public class ActualizarDatosClaseRequest {

    @NotNull(message = "La modalidad del curso es obligatoria")
    private ModalidadCurso modalidad;

    private String enlaceClase;

    private String direccionClase;

    private String aula;

    public ModalidadCurso getModalidad() {
        return modalidad;
    }

    public void setModalidad(ModalidadCurso modalidad) {
        this.modalidad = modalidad;
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
