package com.cursos.certificaciones;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/** Certificado academico. Solo admite PENDIENTE -> EMITIDO | FALLIDO (tambien forzado por trigger). */
@Entity @Table(name="certificados_academicos",schema="public")
public class Certificado {
    public enum Estado { PENDIENTE, EMITIDO, FALLIDO }
    @Id private UUID id;
    @Column(nullable=false,length=32,updatable=false) private String codigo;
    @Column(name="curso_id",nullable=false,updatable=false) private UUID cursoId;
    @Column(name="estudiante_id",nullable=false,updatable=false) private UUID estudianteId;
    @Column(name="aprobacion_id",nullable=false,updatable=false) private UUID aprobacionId;
    @Column(name="historial_id",nullable=false,updatable=false) private UUID historialId;
    @Column(name="revision_academica",nullable=false,updatable=false) private long revisionAcademica;
    @Column(name="evidencia_hash",nullable=false,length=64,updatable=false) private String evidenciaHash;
    @Column(name="estudiante_nombre",nullable=false,length=300,updatable=false) private String estudianteNombre;
    @Column(name="curso_titulo",nullable=false,length=300,updatable=false) private String cursoTitulo;
    @Column(name="emitido_por",nullable=false,updatable=false) private UUID emitidoPor;
    @Column(nullable=false,updatable=false) private UUID idempotencia;
    @Column(name="fecha_emision",nullable=false,updatable=false) private Instant fechaEmision;
    @Column(name="object_key",nullable=false,length=500,updatable=false) private String objectKey;
    @Column(name="pdf_sha256",nullable=false,length=64,updatable=false) private String pdfSha256;
    @Column(name="tamano_bytes",nullable=false,updatable=false) private long tamanoBytes;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private Estado estado;
    @Column(name="created_at",nullable=false,updatable=false) private Instant createdAt;
    @Column(name="actualizado_en",nullable=false) private Instant actualizadoEn;
    @Version private long version;

    protected Certificado() {}
    public Certificado(String codigo,UUID curso,UUID estudiante,UUID aprobacion,UUID historial,long revision,String evidenciaHash,
                       String nombre,String titulo,UUID emisor,UUID clave,Instant fecha,String objectKey,String pdfSha256,long tamano) {
        id=UUID.randomUUID();this.codigo=codigo;cursoId=curso;estudianteId=estudiante;aprobacionId=aprobacion;historialId=historial;
        revisionAcademica=revision;this.evidenciaHash=evidenciaHash;estudianteNombre=nombre;cursoTitulo=titulo;emitidoPor=emisor;
        idempotencia=clave;fechaEmision=fecha;this.objectKey=objectKey;this.pdfSha256=pdfSha256;tamanoBytes=tamano;
        estado=Estado.PENDIENTE;createdAt=fecha;actualizadoEn=fecha;
    }
    public void emitir(Instant ahora){if(estado!=Estado.PENDIENTE) throw new IllegalStateException("Transicion no permitida");estado=Estado.EMITIDO;actualizadoEn=ahora;}
    public void fallar(Instant ahora){if(estado!=Estado.PENDIENTE) throw new IllegalStateException("Transicion no permitida");estado=Estado.FALLIDO;actualizadoEn=ahora;}
    public UUID getId(){return id;}
    public String getCodigo(){return codigo;}
    public UUID getCursoId(){return cursoId;}
    public UUID getEstudianteId(){return estudianteId;}
    public UUID getAprobacionId(){return aprobacionId;}
    public UUID getHistorialId(){return historialId;}
    public long getRevisionAcademica(){return revisionAcademica;}
    public String getEvidenciaHash(){return evidenciaHash;}
    public String getEstudianteNombre(){return estudianteNombre;}
    public String getCursoTitulo(){return cursoTitulo;}
    public UUID getEmitidoPor(){return emitidoPor;}
    public UUID getIdempotencia(){return idempotencia;}
    public Instant getFechaEmision(){return fechaEmision;}
    public String getObjectKey(){return objectKey;}
    public String getPdfSha256(){return pdfSha256;}
    public long getTamanoBytes(){return tamanoBytes;}
    public Estado getEstado(){return estado;}
    public Instant getCreatedAt(){return createdAt;}
}
