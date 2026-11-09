package com.cursos.certificaciones;

import jakarta.persistence.*;
import java.util.UUID;

@Entity @Table(name="aprobaciones_academicas",schema="public")
public class Aprobacion {
    @Id private UUID id;
    @Column(name="curso_id",nullable=false) private UUID cursoId;
    @Column(name="estudiante_id",nullable=false) private UUID estudianteId;
    @Version private long version;
    protected Aprobacion() {}
    public Aprobacion(UUID curso,UUID estudiante) {id=UUID.randomUUID();cursoId=curso;estudianteId=estudiante;}
    public UUID getId(){return id;}
    public UUID getCursoId(){return cursoId;}
    public UUID getEstudianteId(){return estudianteId;}
    public long getVersion(){return version;}
}
