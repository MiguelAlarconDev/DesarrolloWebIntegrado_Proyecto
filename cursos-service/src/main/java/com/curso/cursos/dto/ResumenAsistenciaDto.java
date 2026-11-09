package com.curso.cursos.dto;

import java.util.UUID;

public class ResumenAsistenciaDto {

    private UUID estudianteId;
    private int totalSesiones;
    private int presentes;
    private int tardanzas;
    private int faltasJustificadas;
    private int faltasInjustificadas;
    private double porcentajeInasistencias;
    private boolean inhabilitado; // > 30% inasistencias

    public ResumenAsistenciaDto() {
    }

    public ResumenAsistenciaDto(UUID estudianteId, int totalSesiones, int presentes, int tardanzas, int faltasJustificadas, int faltasInjustificadas) {
        this.estudianteId = estudianteId;
        this.totalSesiones = totalSesiones;
        this.presentes = presentes;
        this.tardanzas = tardanzas;
        this.faltasJustificadas = faltasJustificadas;
        this.faltasInjustificadas = faltasInjustificadas;

        if (totalSesiones > 0) {
            // Cada tardanza cuenta como 0.5 inasistencia académica
            double totalFaltasEquivalentes = faltasInjustificadas + (tardanzas * 0.5);
            this.porcentajeInasistencias = Math.round((totalFaltasEquivalentes / totalSesiones) * 1000.0) / 10.0;
            this.inhabilitado = this.porcentajeInasistencias > 30.0;
        } else {
            this.porcentajeInasistencias = 0.0;
            this.inhabilitado = false;
        }
    }

    public UUID getEstudianteId() {
        return estudianteId;
    }

    public void setEstudianteId(UUID estudianteId) {
        this.estudianteId = estudianteId;
    }

    public int getTotalSesiones() {
        return totalSesiones;
    }

    public void setTotalSesiones(int totalSesiones) {
        this.totalSesiones = totalSesiones;
    }

    public int getPresentes() {
        return presentes;
    }

    public void setPresentes(int presentes) {
        this.presentes = presentes;
    }

    public int getTardanzas() {
        return tardanzas;
    }

    public void setTardanzas(int tardanzas) {
        this.tardanzas = tardanzas;
    }

    public int getFaltasJustificadas() {
        return faltasJustificadas;
    }

    public void setFaltasJustificadas(int faltasJustificadas) {
        this.faltasJustificadas = faltasJustificadas;
    }

    public int getFaltasInjustificadas() {
        return faltasInjustificadas;
    }

    public void setFaltasInjustificadas(int faltasInjustificadas) {
        this.faltasInjustificadas = faltasInjustificadas;
    }

    public double getPorcentajeInasistencias() {
        return porcentajeInasistencias;
    }

    public void setPorcentajeInasistencias(double porcentajeInasistencias) {
        this.porcentajeInasistencias = porcentajeInasistencias;
    }

    public boolean isInhabilitado() {
        return inhabilitado;
    }

    public void setInhabilitado(boolean inhabilitado) {
        this.inhabilitado = inhabilitado;
    }
}
