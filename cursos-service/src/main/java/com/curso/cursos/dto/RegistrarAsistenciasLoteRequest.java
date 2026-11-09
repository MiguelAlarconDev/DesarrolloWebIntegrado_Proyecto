package com.curso.cursos.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public class RegistrarAsistenciasLoteRequest {

    @NotNull
    private UUID cursoId;

    @NotNull
    private Integer numeroSesion;

    @NotBlank
    private String fechaSesion;

    private String temaSesion;

    @JsonAlias({"registradoPor", "docenteId"})
    private UUID docenteId;

    @NotNull
    @JsonAlias({"registros", "estudiantes"})
    private List<ItemAsistenciaEstudiante> estudiantes;

    public static class ItemAsistenciaEstudiante {
        private UUID estudianteId;
        private String estado; // "P", "T", "FJ", "F"
        private String observaciones;

        public ItemAsistenciaEstudiante() {
        }

        public UUID getEstudianteId() {
            return estudianteId;
        }

        public void setEstudianteId(UUID estudianteId) {
            this.estudianteId = estudianteId;
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
    }

    public RegistrarAsistenciasLoteRequest() {
    }

    public UUID getCursoId() {
        return cursoId;
    }

    public void setCursoId(UUID cursoId) {
        this.cursoId = cursoId;
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

    public UUID getDocenteId() {
        return docenteId;
    }

    public void setDocenteId(UUID docenteId) {
        this.docenteId = docenteId;
    }

    public List<ItemAsistenciaEstudiante> getEstudiantes() {
        return estudiantes;
    }

    public void setEstudiantes(List<ItemAsistenciaEstudiante> estudiantes) {
        this.estudiantes = estudiantes;
    }
}
